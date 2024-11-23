import { resolve, basename, relative } from "node:path";
import * as tstl from "@cc-ts/typescript-to-lua";
import * as ts from "typescript";
import { SourceNode } from "source-map";
import { findLuaRequires } from "@cc-ts/typescript-to-lua/dist/transpilation/find-lua-requires";
import { normalizeSlashes } from "@cc-ts/typescript-to-lua/dist/utils";
import {
    buildMinimalLualibBundle,
    findUsedLualibFeatures,
} from "@cc-ts/typescript-to-lua/dist/LuaLib";
import luamin from "luamin";

import { formatPathToLuaPath, trimExtension } from "./utils";
import { logger as baseLogger } from "./logger";
import { version } from "../package.json";
import type { CompilerOptions } from "./CompilerOptions";

// Constants
const hashPlaceholder = "{#Hash}";
export const sourceMapTracebackBundlePlaceholder =
    "{#SourceMapTracebackBundle}";

const requireOverride = /* lua */ `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file, ...)
    if ____moduleCache[file] then
        return ____moduleCache[file].value
    end
    if ____modules[file] then
        local module = ____modules[file]
        if select("#", ...) > 0 then
            ____moduleCache[file] = { value = module(...) }
        else
            ____moduleCache[file] = { value = module(file) }
        end
        return ____moduleCache[file].value
    else
        if ____originalRequire then
            return ____originalRequire(file)
        else
            error("module '" .. file .. "' not found")
        end
    end
end
`;

// Types
type SourceChunk = string | SourceNode;
type SourceMapLineData = number | { line: number; file: string };

// Helper Functions

export class CCBundler {
    private logger = baseLogger.child({ class: "CCBundler" });

    private modules: Map<string, tstl.ProcessedFile>;
    private moduleDependencies: Map<string, string[]>;
    private visitedModules: Set<string>;

    constructor(
        private files: tstl.ProcessedFile[],
        private program: ts.Program,
        protected emitHost: tstl.EmitHost
    ) {
        this.logger.debug("Initializing CCBundler", {
            fileCount: files.length,
        });
        this.modules = new Map(
            this.files.map((f) => [this.createModulePath(f.fileName), f])
        );

        this.moduleDependencies = new Map();
        this.visitedModules = new Set();

        this.logger.trace("Resolving module dependencies");
        for (const [moduleName] of this.modules) {
            this.resolveModuleDependencies(moduleName);
        }
        this.logger.trace("Module dependencies resolved");
    }

    public createModulePath(pathToResolve: string) {
        this.logger.trace("Creating module path", { pathToResolve });
        return formatPathToLuaPath(
            trimExtension(
                tstl.getEmitPathRelativeToOutDir(pathToResolve, this.program)
            )
        );
    }

    public isBuiltInModule(moduleName: string) {
        const isBuiltIn =
            moduleName.startsWith("cc.") || moduleName === "lualib_bundle";
        this.logger.trace("Checking if module is built-in", {
            moduleName,
            isBuiltIn,
        });
        return isBuiltIn;
    }

    public bundleModule(moduleName: string) {
        const moduleLogger = this.logger.child({ moduleName });
        moduleLogger.debug("Bundling module");

        const options = this.program.getCompilerOptions() as CompilerOptions;
        const dependencies = this.moduleDependencies.get(moduleName) ?? [];
        const sourceDir = tstl.getSourceDir(this.program);

        moduleLogger.debug("Looking up entry file");
        const entryFile = this.modules.get(moduleName);
        if (!entryFile) {
            moduleLogger.error("Entry module not found");
            throw new Error(`Module ${moduleName} not found`);
        }

        const files = [entryFile];

        // Collect dependencies
        moduleLogger.debug("Collecting dependencies", {
            dependencyCount: dependencies.length,
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
            if (!file) {
                moduleLogger.error("Dependency module not found", {
                    dependency,
                });
                throw new Error(`Module ${dependency} not found`);
            }
            this.logger.trace("Adding dependency to bundle", { dependency });
            files.push(file);
        }

        // Handle lualib if needed
        const isLuaLibRequired = dependencies.includes("lualib_bundle");
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

        let sourceChunks = [
            requireOverride,
            moduleTable,
            ...footers,
            entryPoint,
        ];

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
                        .filter(
                            (f) =>
                                !this.isBuiltInModule(
                                    this.createModulePath(f.fileName)
                                )
                        )
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

        moduleLogger.debug("Bundle generation complete");
        return {
            outputPath,
            code,
            sourceMap: map.toString(),
            sourceFiles: files.flatMap((f) => f.sourceFiles ?? []),
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
        const header = `-- Generated by @cc-ts/builder@${version}
    -- HeaderSchema: @cc-ts/builder - v0.0.1
    -- Entry: ${entry}
    -- Hash: ${hashPlaceholder}
    -- BuildTime: ${new Date().toISOString()}
    -- Files: ${files.join(", ")}
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

    private resolveModuleDependencies(moduleName: string): string[] {
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
                return [];
            }
            moduleLogger.error("Module not found");
            throw new Error(`Module ${moduleName} not found`);
        }

        if (this.moduleDependencies.has(moduleName)) {
            moduleLogger.trace("Using cached module dependencies");
            return this.moduleDependencies.get(moduleName)!;
        }

        if (this.visitedModules.has(moduleName)) {
            moduleLogger.trace(
                "Module already visited, skipping to prevent circular dependencies"
            );
            return [];
        }

        this.visitedModules.add(moduleName);

        const requires = findLuaRequires(file.code);
        if (!requires) {
            moduleLogger.debug("No requires found in module");
            this.moduleDependencies.set(moduleName, []);
            this.visitedModules.delete(moduleName);
            return [];
        }
        moduleLogger.debug(`Found ${requires.length} requires`, { requires });

        const dependencies = requires.flatMap(({ requirePath }) => {
            moduleLogger.trace("Resolving nested dependency", { requirePath });
            const deps = this.resolveModuleDependencies(requirePath);
            return [requirePath, ...deps];
        });

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
            if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
                const line = getLineNumber(currentLine, mappedPosition.line);

                map[currentLine] = {
                    line,
                    file: basename(mappedPosition.source),
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
        const luaTarget = tstl.LuaTarget.Cobalt52;
        const usedFeatures = findUsedLualibFeatures(
            luaTarget,
            this.emitHost,
            resolvedFiles.map((f) => f.code)
        );
        this.logger.trace("Used lualib features", { usedFeatures });
        return buildMinimalLualibBundle(usedFeatures, luaTarget, this.emitHost);
    }
}
