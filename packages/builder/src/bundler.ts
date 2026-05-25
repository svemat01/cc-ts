import { resolve, relative } from "node:path";
import * as tstl from "@jackmacwindows/typescript-to-lua";
import * as ts from "typescript";
import { SourceNode } from "source-map";
import { findLuaRequires } from "@jackmacwindows/typescript-to-lua/dist/transpilation/find-lua-requires";
import { normalizeSlashes } from "@jackmacwindows/typescript-to-lua/dist/utils";
import {
    buildMinimalLualibBundle,
    findUsedLualibFeatures,
} from "@jackmacwindows/typescript-to-lua/dist/LuaLib";
import luamin from "luamin";

import { formatPathToLuaPath, trimExtension } from "./utils";
import { logger as baseLogger } from "./logger";
import { version } from "../package.json";
import type { CompilerOptions } from "./CompilerOptions";
import {
    findMatchingExternalRule,
    getPackageNameFromFile,
    normalizeAnalysisPath,
    normalizeExternalRules,
    type BuilderAnalysis,
    type BuilderDependencyInfo,
    type BuilderEmitFile,
    type BuilderEntrypointAnalysis,
    type BuilderGraphSnapshot,
    type ResolvedExternalModuleRule,
} from "./analysis";
import {
    copiedExternalModuleMissing,
    entryModuleNotFound,
    moduleNotFound,
} from "./diagnostics";

// Constants
const hashPlaceholder = "{#Hash}";
export const sourceMapTracebackBundlePlaceholder =
    "{#SourceMapTracebackBundle}";

const requireOverride = /* lua */ `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file, ...)
    local moduleKey = file
    local externalTarget = select(1, ...)
    if ____moduleCache[moduleKey] then
        return ____moduleCache[moduleKey].value
    end
    if ____modules[moduleKey] then
        local module = ____modules[moduleKey]
        if select("#", ...) > 0 then
            ____moduleCache[moduleKey] = { value = module(...) }
        else
            ____moduleCache[moduleKey] = { value = module(moduleKey) }
        end
        return ____moduleCache[moduleKey].value
    else
        if ____originalRequire then
            if externalTarget ~= nil then
                return ____originalRequire(externalTarget)
            end
            return ____originalRequire(moduleKey)
        else
            if externalTarget ~= nil then
                error("module '" .. externalTarget .. "' not found")
            end
            error("module '" .. moduleKey .. "' not found")
        end
    end
end
`;

// Types
type SourceChunk = string | SourceNode;
type SourceMapLineData = number | { line: number; file: string };
type CopiedDependency = {
    fileName: string;
    outputPath: string;
    extraPath?: string;
};

const externalRequirePattern = /require\(\s*nil\s*,\s*["']([^"']+)["']\s*\)/g;

const findBuilderRequires = (code: string) => {
    const requirePaths = new Set(
        findLuaRequires(code).map(({ requirePath }) => requirePath)
    );

    for (const match of code.matchAll(externalRequirePattern)) {
        if (match[1]) {
            requirePaths.add(match[1]);
        }
    }

    return [...requirePaths];
};

// Helper Functions

export class CCBundler {
    private logger = baseLogger.child({ class: "CCBundler" });

    private modules: Map<string, tstl.ProcessedFile>;
    private moduleDependencies: Map<string, Set<string>>;
    private visitedModules: Set<string>;
    private externalRules: ResolvedExternalModuleRule[];
    private copiedDependencies: Map<string, CopiedDependency>;
    private lualibFeatures: string[] = [];

    constructor(
        private files: tstl.ProcessedFile[],
        private program: ts.Program,
        protected emitHost: tstl.EmitHost,
        protected diagnostics: ts.Diagnostic[]
    ) {
        this.logger.debug("Initializing CCBundler", {
            fileCount: files.length,
        });
        this.modules = new Map(
            this.files.map((f) => [this.createModulePath(f.fileName), f])
        );

        this.moduleDependencies = new Map();
        this.visitedModules = new Set();
        this.externalRules = normalizeExternalRules(
            (this.program.getCompilerOptions() as CompilerOptions).externals
        );
        this.copiedDependencies = new Map();

        this.logger.trace("Resolving module dependencies");
        for (const [moduleName] of this.modules) {
            this.resolveModuleDependencies(moduleName);
        }
        this.logger.trace("Module dependencies resolved");
    }

    public getModuleDependencies(): ReadonlyMap<string, Set<string>> {
        return this.moduleDependencies;
    }

    public getModuleFiles(): ReadonlyMap<string, tstl.ProcessedFile> {
        return this.modules;
    }

    public getCopiedDependencies(): ReadonlyMap<string, CopiedDependency> {
        return this.copiedDependencies;
    }

    private toAnalysisPath(fileName: string): string {
        const projectRoot = tstl.getProjectRoot(this.program);
        const relativePath = relative(projectRoot, fileName);
        return relativePath.startsWith("..")
            ? normalizeAnalysisPath(fileName)
            : normalizeAnalysisPath(relativePath);
    }

    private getExternalRule(
        moduleName: string,
        file?: tstl.ProcessedFile
    ): ResolvedExternalModuleRule | undefined {
        return findMatchingExternalRule(
            this.externalRules,
            moduleName,
            file?.fileName,
            file ? getPackageNameFromFile(file.fileName) : undefined
        );
    }

    /** Lua module key for a bundled emit file (not for external/builtin require names). */
    public createModulePath(pathToResolve: string) {
        this.logger.trace("Creating module path", { pathToResolve });
        return formatPathToLuaPath(
            trimExtension(
                tstl.getEmitPathRelativeToOutDir(pathToResolve, this.program)
            )
        );
    }

    private matchesConfiguredBuiltInModule(
        moduleName: string,
        configuredModules: readonly string[] | undefined
    ) {
        return (configuredModules ?? []).some(
            (configuredModule) =>
                configuredModule === moduleName ||
                formatPathToLuaPath(configuredModule) === moduleName
        );
    }

    public isBuiltInModule(moduleName: string) {
        const options = this.program.getCompilerOptions() as CompilerOptions;
        const matchedRule = this.getExternalRule(moduleName);
        const isBuiltIn =
            moduleName.startsWith("cc.") ||
            moduleName === "lualib_bundle" ||
            this.matchesConfiguredBuiltInModule(
                moduleName,
                options.builtInModules
            ) ||
            matchedRule?.mode === "builtin";
        this.logger.trace("Checking if module is built-in", {
            moduleName,
            isBuiltIn,
        });
        return isBuiltIn;
    }

    private shouldCopyExternalModule(moduleName: string, file?: tstl.ProcessedFile) {
        const matchedRule = this.getExternalRule(moduleName, file);
        return matchedRule?.mode === "copy";
    }

    private shouldLeaveExternalModule(
        moduleName: string,
        file?: tstl.ProcessedFile
    ) {
        const matchedRule = this.getExternalRule(moduleName, file);
        return matchedRule?.mode === "external";
    }

    private getCopiedOutputPath(
        moduleName: string,
        rule?: ResolvedExternalModuleRule
    ) {
        const outDir = tstl.getEmitOutDir(this.program);
        const relativeRuntimePath = moduleName.split(".").join("/") + ".lua";
        const copyRoot = rule?.outDir ? rule.outDir : "";

        return copyRoot.length > 0
            ? resolve(outDir, copyRoot, relativeRuntimePath)
            : resolve(outDir, relativeRuntimePath);
    }

    private registerCopiedDependency(
        moduleName: string,
        file: tstl.ProcessedFile,
        rule?: ResolvedExternalModuleRule
    ): CopiedDependency {
        let copiedDependency = this.copiedDependencies.get(moduleName);
        if (!copiedDependency) {
            copiedDependency = {
                fileName: file.fileName,
                outputPath: this.getCopiedOutputPath(moduleName, rule),
                extraPath: rule?.outDir,
            };
            this.copiedDependencies.set(moduleName, copiedDependency);
        }

        return copiedDependency;
    }

    private collectCopiedDependencyClosure(
        moduleName: string,
        inheritedRule?: ResolvedExternalModuleRule,
        seen = new Set<string>()
    ): string[] | undefined {
        if (seen.has(moduleName)) {
            return [];
        }
        seen.add(moduleName);

        if (this.isBuiltInModule(moduleName) || moduleName === "lualib_bundle") {
            return [];
        }

        const file = this.modules.get(moduleName);
        const matchedRule = this.getExternalRule(moduleName, file) ?? inheritedRule;
        if (!file) {
            if (matchedRule?.mode === "external") {
                return [];
            }
            this.diagnostics.push(copiedExternalModuleMissing(moduleName));
            return undefined;
        }

        const copiedModules = [moduleName];
        const dependencies = this.moduleDependencies.get(moduleName) ?? new Set();
        for (const dependency of dependencies) {
            if (
                this.isBuiltInModule(dependency) ||
                dependency === "lualib_bundle"
            ) {
                continue;
            }

            const dependencyRule =
                this.getExternalRule(dependency, this.modules.get(dependency)) ??
                matchedRule;
            if (dependencyRule?.mode === "external") {
                continue;
            }

            const nested = this.collectCopiedDependencyClosure(
                dependency,
                dependencyRule?.mode === "copy" ? dependencyRule : matchedRule,
                seen
            );
            if (nested === undefined) {
                return undefined;
            }
            copiedModules.push(...nested);
        }

        return copiedModules;
    }

    public createGraphSnapshot(
        entryModuleMap: ReadonlyMap<string, string>
    ): BuilderGraphSnapshot {
        return {
            entryModules: Object.fromEntries(entryModuleMap.entries()),
            moduleFiles: Object.fromEntries(
                [...this.modules.entries()].map(([moduleName, file]) => [
                    moduleName,
                    file.fileName,
                ])
            ),
            moduleDependencies: Object.fromEntries(
                [...this.moduleDependencies.entries()].map(
                    ([moduleName, dependencies]) => [
                        moduleName,
                        [...dependencies].sort(),
                    ]
                )
            ),
        };
    }

    public createAnalysis(
        graph: BuilderGraphSnapshot,
        emitPlan: readonly BuilderEmitFile[]
    ): BuilderAnalysis {
        const entryDependencies = new Map<string, Set<string>>();
        for (const entry of emitPlan) {
            const analysis = entry.analysis;
            if (!analysis) {
                continue;
            }

            entryDependencies.set(
                analysis.entry,
                new Set([
                    analysis.entry,
                    ...analysis.bundledModules,
                    ...analysis.externalModules,
                    ...analysis.builtInModules,
                    ...analysis.copiedModules,
                    ...(analysis.usesLuaLib ? ["lualib_bundle"] : []),
                ])
            );
        }

        const dependencyMap = new Map<string, BuilderDependencyInfo>();
        const getOrCreateDependency = (moduleName: string) => {
            let dependency = dependencyMap.get(moduleName);
            if (!dependency) {
                dependency = {
                    moduleName,
                    kind: "unresolved",
                    reason: "Dependency was discovered during bundle analysis.",
                    entrypoints: [],
                    dependents: [],
                };
                dependencyMap.set(moduleName, dependency);
            }
            return dependency;
        };

        for (const [entry, dependencies] of entryDependencies.entries()) {
            for (const moduleName of dependencies) {
                const dependency = getOrCreateDependency(moduleName);
                if (!dependency.entrypoints.includes(entry)) {
                    dependency.entrypoints.push(entry);
                }
            }
        }

        for (const [moduleName, dependencies] of this.moduleDependencies.entries()) {
            for (const dependencyName of dependencies) {
                const dependency = getOrCreateDependency(dependencyName);
                if (!dependency.dependents.includes(moduleName)) {
                    dependency.dependents.push(moduleName);
                }
            }
        }

        const copiedOutputPaths = new Map(this.copiedDependencies.entries());
        for (const [moduleName, fileName] of Object.entries(graph.moduleFiles)) {
            const dependency = getOrCreateDependency(moduleName);
            dependency.fileName = this.toAnalysisPath(fileName);
            dependency.packageName = getPackageNameFromFile(fileName);
            if (Object.prototype.hasOwnProperty.call(graph.entryModules, moduleName)) {
                dependency.kind = "entry";
                dependency.reason = "Selected as a build entrypoint.";
            } else if (moduleName === "lualib_bundle") {
                dependency.kind = "lualib";
                dependency.reason = "Generated lualib runtime for this bundle.";
            } else if (
                this.shouldLeaveExternalModule(moduleName, this.modules.get(moduleName))
            ) {
                dependency.kind = "external";
                dependency.reason =
                    "Resolved to a runtime file but explicitly kept external by builder configuration.";
            } else if (copiedOutputPaths.has(moduleName)) {
                const copied = copiedOutputPaths.get(moduleName)!;
                dependency.kind = "copied";
                dependency.reason = "External runtime file copied into the output directory.";
                dependency.outputPath = this.toAnalysisPath(copied.outputPath);
            } else {
                dependency.kind = "bundled";
                dependency.reason = "Bundled directly into an entrypoint output.";
            }

            const matchedRule = findMatchingExternalRule(
                this.externalRules,
                moduleName,
                fileName,
                dependency.packageName
            );
            if (matchedRule) {
                dependency.matchedRule = {
                    pattern: matchedRule.pattern,
                    mode: matchedRule.mode,
                    outDir: matchedRule.outDir,
                    reason: matchedRule.reason,
                };
            }
        }

        const discoveredModules = new Set<string>([
            ...Object.keys(graph.moduleFiles),
            ...Object.values(graph.moduleDependencies).flat(),
        ]);
        for (const moduleName of discoveredModules) {
            const dependency = getOrCreateDependency(moduleName);
            if (dependency.kind !== "unresolved") {
                continue;
            }

            if (this.isBuiltInModule(moduleName)) {
                dependency.kind = moduleName === "lualib_bundle" ? "lualib" : "builtin";
                dependency.reason =
                    moduleName === "lualib_bundle"
                        ? "Generated lualib runtime for this bundle."
                        : "Handled as a built-in/external runtime module.";
            } else if (copiedOutputPaths.has(moduleName)) {
                const copied = copiedOutputPaths.get(moduleName)!;
                dependency.kind = "copied";
                dependency.reason = "External runtime file copied into the output directory.";
                dependency.outputPath = this.toAnalysisPath(copied.outputPath);
            } else if (!this.modules.has(moduleName)) {
                dependency.kind = "external";
                dependency.reason = "Left external for runtime resolution.";
            }
        }

        return {
            generatedBy: `@cc-ts/builder@${version}`,
            formatVersion: 1,
            entrypoints: emitPlan
                .map((file) => file.analysis)
                .filter(
                    (analysis): analysis is BuilderEntrypointAnalysis =>
                        analysis !== undefined
                ),
            dependencies: [...dependencyMap.values()].sort((a, b) =>
                a.moduleName.localeCompare(b.moduleName)
            ),
            copiedFiles: [...this.copiedDependencies.entries()].map(
                ([moduleName, copied]) => ({
                    moduleName,
                    outputPath: this.toAnalysisPath(copied.outputPath),
                    fileName: this.toAnalysisPath(copied.fileName),
                })
            ),
            warnings: [],
        };
    }

    public bundleModule(moduleName: string) {
        const moduleLogger = this.logger.child({ moduleName });
        moduleLogger.debug("Bundling module");

        const options = this.program.getCompilerOptions() as CompilerOptions;
        const dependencies =
            this.moduleDependencies.get(moduleName) ?? new Set();
        const sourceDir = tstl.getSourceDir(this.program);

        moduleLogger.debug("Looking up entry file");
        const entryFile = this.modules.get(moduleName);
        if (!entryFile) {
            this.diagnostics.push(entryModuleNotFound(moduleName));
            return;
        }

        const files = [entryFile];

        // Collect dependencies
        moduleLogger.debug("Collecting dependencies", {
            dependencyCount: dependencies.size,
        });
        for (const dependency of dependencies) {
            if (
                this.isBuiltInModule(dependency) ||
                dependency === "lualib_bundle"
            ) {
                this.logger.trace("Skipping built-in dependency", {
                    dependency,
                });
                continue;
            }

            const file = this.modules.get(dependency);
            const matchedRule = this.getExternalRule(dependency, file);
            if (!file) {
                if (matchedRule?.mode === "external") {
                    continue;
                }
                this.diagnostics.push(moduleNotFound(dependency, true));
                return;
            }

            if (this.shouldLeaveExternalModule(dependency, file)) {
                this.logger.trace("Leaving resolved module external", {
                    dependency,
                });
                continue;
            }

            if (this.shouldCopyExternalModule(dependency, file)) {
                const copiedModules = this.collectCopiedDependencyClosure(
                    dependency,
                    matchedRule
                );
                if (copiedModules === undefined) {
                    return;
                }

                for (const copiedModule of copiedModules) {
                    const copiedFile = this.modules.get(copiedModule);
                    if (!copiedFile) {
                        this.diagnostics.push(
                            copiedExternalModuleMissing(copiedModule)
                        );
                        return;
                    }

                    const copiedRule =
                        this.getExternalRule(copiedModule, copiedFile) ??
                        matchedRule;
                    this.registerCopiedDependency(
                        copiedModule,
                        copiedFile,
                        copiedRule
                    );
                }
                continue;
            }

            this.logger.trace("Adding dependency to bundle", { dependency });
            files.push(file);
        }

        // Handle lualib if needed
        const isLuaLibRequired = dependencies.has("lualib_bundle");
        if (isLuaLibRequired) {
            moduleLogger.debug("Including lualib bundle");
            const fileName = normalizeSlashes(
                resolve(
                    tstl.getSourceDir(this.program),
                    (options.luaLibName ?? "lualib_bundle") + ".lua"
                )
            );
            const code = this.getLuaLibBundleContent(options, files);
            files.unshift({ fileName, code });
        }

        // Build bundle
        moduleLogger.debug("Building module table entries");
        const moduleTableEntries = files.map((f) =>
            this.moduleSourceNode(
                f,
                tstl.escapeString(this.createModulePath(f.fileName))
            )
        );

        const moduleTable = this.createModuleTableNode(moduleTableEntries);
        const entryPoint = `return require(${tstl.escapeString(
            moduleName
        )}, ...)`;

        const footers: string[] = [];
        if (options.sourceMapTraceback) {
            moduleLogger.debug("Adding source map traceback");
            // Generates SourceMapTraceback for the entire file
            footers.push(
                `local __TS__SourceMapTraceBack = require("${
                    options.luaLibName ?? "lualib_bundle"
                }").__TS__SourceMapTraceBack\n`
            );
            footers.push(`${sourceMapTracebackBundlePlaceholder}\n`);
        }

        const runtimeExtraPaths = [
            ...(options.extraPaths ?? []),
            ...[...this.copiedDependencies.values()]
                .map((dependency) => dependency.extraPath)
                .filter((value): value is string => value !== undefined),
        ].filter((value, index, values) => values.indexOf(value) === index);

        let sourceChunks = [
            runtimeExtraPaths.length > 0 &&
                /* lua */ `
local ____defaultPath = package.path
package.path = ____defaultPath.."${runtimeExtraPaths
                    .map(
                        (path) => `;${path}/?.lua;${path}/?/init.lua`
                    )
                    .join("")}"
            `,
            requireOverride,
            moduleTable,
            ...footers,
            runtimeExtraPaths.length > 0
                ? /* lua */ `
local ____export = require(${tstl.escapeString(moduleName)}, ...)
package.path = ____defaultPath
return ____export
`
                : entryPoint,
        ].filter((chunk) => chunk !== undefined && chunk !== false);

        if (options.minify) {
            const code = this.joinSourceChunks(sourceChunks).toString();
            sourceChunks = ["\n" + luamin.minify(code)];
            moduleLogger.debug("Minified source");
        }

        if (!options.noHeader) {
            moduleLogger.debug("Adding bundle header");
            sourceChunks.unshift(
                this.generateHeader({
                    entry: moduleName,
                    files: files
                        .filter((f) => {
                            const bundledModulePath = this.createModulePath(
                                f.fileName
                            );
                            return (
                                bundledModulePath !== "lualib_bundle" &&
                                !this.isBuiltInModule(bundledModulePath) &&
                                !this.shouldLeaveExternalModule(
                                    bundledModulePath,
                                    f
                                )
                            );
                        })
                        .map((f) =>
                            relative(sourceDir, f.fileName).replaceAll(
                                "../node_modules/",
                                ""
                            )
                        ),
                    minify: options.minify === true ? true : false,
                })
            );
        }

        moduleLogger.debug("Generating bundle");
        const bundleNode = this.joinSourceChunks(sourceChunks);
        let { code, map } = bundleNode.toStringWithSourceMap();
        code = code.replace(
            sourceMapTracebackBundlePlaceholder,
            this.printStackTraceBundleOverride(bundleNode)
        );
        code = code.replace(hashPlaceholder, Bun.hash(code).toString(36));
        const outputPath = tstl.getEmitPath(entryFile.fileName, this.program);
        const bundledModules = files
            .map((file) => this.createModulePath(file.fileName))
            .filter(
                (dependency) =>
                    dependency !== moduleName && dependency !== "lualib_bundle"
            )
            .sort();
        const copiedModules = [...dependencies]
            .flatMap((dependency) => {
                const file = this.modules.get(dependency);
                if (!file || !this.shouldCopyExternalModule(dependency, file)) {
                    return [];
                }

                return (
                    this.collectCopiedDependencyClosure(
                        dependency,
                        this.getExternalRule(dependency, file)
                    ) ?? []
                );
            })
            .filter((value, index, values) => values.indexOf(value) === index)
            .sort();
        const externalModules = [...dependencies]
            .filter(
                (dependency) =>
                    !this.modules.has(dependency) &&
                    !this.isBuiltInModule(dependency) &&
                    dependency !== "lualib_bundle"
            )
            .sort();
        const builtInModules = [...dependencies]
            .filter(
                (dependency) =>
                    this.isBuiltInModule(dependency) && dependency !== "lualib_bundle"
            )
            .sort();

        moduleLogger.debug("Bundle generation complete");
        return {
            outputPath,
            code,
            sourceMap: map.toString(),
            sourceFiles: files.flatMap((f) => f.sourceFiles ?? []),
            analysis: {
                entry: moduleName,
                outputPath: this.toAnalysisPath(outputPath),
                bundledModules,
                copiedModules,
                externalModules,
                builtInModules,
                files: files
                    .filter((file) => this.modules.has(this.createModulePath(file.fileName)))
                    .map((file) => this.toAnalysisPath(file.fileName))
                    .sort(),
                usesLuaLib: isLuaLibRequired,
                lualibFeatures: [...this.lualibFeatures].sort(),
                size: code.length,
            },
        };
    }

    public generateHeader({
        entry,
        files,
        minify,
    }: {
        entry: string;
        files: string[];
        minify: boolean;
    }) {
        this.logger.trace("Generating bundle header", { entry, files, minify });
        const options = this.program.getCompilerOptions() as CompilerOptions;
        const sortedFiles = [...files].sort();
        const header = `-- Generated by @cc-ts/builder@${version}
-- HeaderSchema: @cc-ts/builder - v0.0.1
-- Entry: ${entry}
-- Hash: ${hashPlaceholder}
-- BuildTime: ${options.reproducible ? "reproducible" : new Date().toISOString()}
-- Files: ${sortedFiles.join(", ")}
-- Minified: ${minify}`;

        return header;
    }

    private moduleSourceNode(
        { code, sourceMapNode }: tstl.ProcessedFile,
        modulePath: string
    ): SourceNode {
        this.logger.trace("Creating module source node", { modulePath });
        const tableEntryHead = `[${modulePath}] = function(...) \n`;
        const tableEntryTail = " end,\n";

        return this.joinSourceChunks([
            tableEntryHead,
            sourceMapNode ?? code,
            tableEntryTail,
        ]);
    }

    private createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
        this.logger.trace("Creating module table node", {
            chunkCount: fileChunks.length,
        });
        const tableHead = "____modules = {\n";
        const tableEnd = "}\n";

        return this.joinSourceChunks([tableHead, ...fileChunks, tableEnd]);
    }

    private joinSourceChunks(chunks: SourceChunk[]): SourceNode {
        this.logger.trace("Joining source chunks", {
            chunkCount: chunks.length,
        });
        return new SourceNode(null, null, null, chunks);
    }

    private resolveModuleDependencies(moduleName: string): Set<string> {
        const moduleLogger = this.logger.child({ moduleName });
        moduleLogger.debug("Resolving module dependencies");

        const file = this.modules.get(moduleName);
        if (!file) {
            if (
                this.isBuiltInModule(moduleName) ||
                moduleName === "lualib_bundle"
            ) {
                moduleLogger.trace(
                    "Skipping built-in module dependency resolution"
                );
                return new Set();
            }

            this.diagnostics.push(moduleNotFound(moduleName, false));
            return new Set();
        }

        if (this.moduleDependencies.has(moduleName)) {
            moduleLogger.trace("Using cached module dependencies");
            return this.moduleDependencies.get(moduleName)!;
        }

        if (this.visitedModules.has(moduleName)) {
            moduleLogger.trace(
                "Module already visited, skipping to prevent circular dependencies"
            );
            return new Set();
        }

        this.visitedModules.add(moduleName);

        const requires = findBuilderRequires(file.code);
        if (requires.length === 0) {
            moduleLogger.debug("No requires found in module");
            this.moduleDependencies.set(moduleName, new Set());
            this.visitedModules.delete(moduleName);
            return new Set();
        }
        moduleLogger.debug(`Found ${requires.length} requires`, { requires });

        const dependencies = new Set(
            requires.flatMap((requirePath) => {
                moduleLogger.trace("Resolving nested dependency", {
                    requirePath,
                });
                const deps = this.resolveModuleDependencies(requirePath);
                return [requirePath, ...deps];
            })
        );

        moduleLogger.debug("Setting module dependencies", { dependencies });
        this.moduleDependencies.set(moduleName, dependencies);
        this.visitedModules.delete(moduleName);

        return dependencies;
    }

    private printStackTraceBundleOverride(rootNode: SourceNode): string {
        this.logger.debug("Generating stack trace bundle override");
        const map: Record<number, SourceMapLineData> = {};
        const getLineNumber = (line: number, fallback: number) => {
            const data: SourceMapLineData | undefined = map[line];
            if (data === undefined) {
                return fallback;
            }
            if (typeof data === "number") {
                return data;
            }
            return data.line;
        };
        const transformLineData = (data: SourceMapLineData) => {
            if (typeof data === "number") {
                return data;
            }
            return `{line = ${data.line}, file = "${data.file}"}`;
        };

        let currentLine = 1;
        rootNode.walk((chunk, mappedPosition) => {
            if (
                mappedPosition.line !== undefined &&
                mappedPosition.line > 0 &&
                mappedPosition.source
            ) {
                const line = getLineNumber(currentLine, mappedPosition.line);

                map[currentLine] = {
                    line,
                    file: normalizeAnalysisPath(mappedPosition.source),
                };
            }

            currentLine += chunk.split("\n").length - 1;
        });

        const mapItems = Object.entries(map).map(
            ([line, original]) => `["${line}"] = ${transformLineData(original)}`
        );
        const mapString = "{" + mapItems.join(",") + "}";

        this.logger.trace("Stack trace bundle override generated");
        return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapString});`;
    }

    private getLuaLibBundleContent(
        options: ts.CompilerOptions,
        resolvedFiles: tstl.ProcessedFile[]
    ) {
        this.logger.debug("Building lualib bundle content");
        const luaTarget =
            (options.luaTarget as tstl.LuaTarget | undefined) ??
            tstl.LuaTarget.Universal;
        const usedFeatures = findUsedLualibFeatures(
            luaTarget,
            this.emitHost,
            resolvedFiles.map((f) => f.code)
        );
        this.lualibFeatures = [...usedFeatures].map((feature) => `${feature}`);
        this.logger.trace("Used lualib features", { usedFeatures });
        return buildMinimalLualibBundle(usedFeatures, luaTarget, this.emitHost);
    }
}
