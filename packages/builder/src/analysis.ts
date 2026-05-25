import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import * as path from "node:path";
import * as ts from "typescript";
import type * as tstl from "@jackmacwindows/typescript-to-lua";
import { Glob } from "bun";

import type { CompilerOptions } from "./CompilerOptions";
import {
    nodeBuiltinRequiresExternalization,
    unsupportedJavaScriptPackage,
} from "./diagnostics";

export type AnalysisFormat = "text" | "json";
export type ExternalModuleMode = "builtin" | "external" | "copy";
export type BuilderDependencyKind =
    | "entry"
    | "bundled"
    | "copied"
    | "builtin"
    | "external"
    | "lualib"
    | "unresolved";

export interface ExternalModuleRule {
    pattern: string;
    mode?: ExternalModuleMode;
    outDir?: string;
    reason?: string;
}

export interface ResolvedExternalModuleRule extends ExternalModuleRule {
    mode: ExternalModuleMode;
    matcher: Glob;
}

export interface BuilderDependencyInfo {
    moduleName: string;
    kind: BuilderDependencyKind;
    reason: string;
    fileName?: string;
    outputPath?: string;
    packageName?: string;
    entrypoints: string[];
    dependents: string[];
    matchedRule?: ExternalModuleRule;
}

export interface BuilderEntrypointAnalysis {
    entry: string;
    outputPath: string;
    bundledModules: string[];
    copiedModules: string[];
    externalModules: string[];
    builtInModules: string[];
    files: string[];
    usesLuaLib: boolean;
    lualibFeatures: string[];
    size: number;
}

export interface BuilderAnalysis {
    generatedBy: string;
    formatVersion: number;
    entrypoints: BuilderEntrypointAnalysis[];
    dependencies: BuilderDependencyInfo[];
    copiedFiles: Array<{
        moduleName: string;
        outputPath: string;
        fileName?: string;
    }>;
    warnings: string[];
}

export interface BuilderEmitFile extends tstl.EmitFile {
    analysis?: BuilderEntrypointAnalysis;
}

export interface BuilderGraphSnapshot {
    entryModules: Record<string, string>;
    moduleFiles: Record<string, string>;
    moduleDependencies: Record<string, string[]>;
}

export interface BuilderBuildInfo {
    analysis: BuilderAnalysis;
    emitPlan: readonly tstl.EmitFile[];
    graph: BuilderGraphSnapshot;
    diagnostics: readonly ts.Diagnostic[];
}

const normalizedNodeBuiltins = new Set(
    builtinModules.flatMap((moduleName) =>
        moduleName.startsWith("node:")
            ? [moduleName, moduleName.slice(5)]
            : [moduleName, `node:${moduleName}`]
    )
);

const normalizePath = (value: string) =>
    path.normalize(value).replaceAll("\\", "/");

export const normalizeAnalysisPath = normalizePath;

export const isNodeBuiltinModule = (moduleName: string) =>
    normalizedNodeBuiltins.has(moduleName);

export const normalizeExternalRules = (
    rules: ExternalModuleRule[] | undefined
): ResolvedExternalModuleRule[] =>
    (rules ?? []).map((rule) => ({
        ...rule,
        mode: rule.mode ?? "external",
        matcher: new Glob(rule.pattern),
    }));

export function findMatchingExternalRule(
    rules: readonly ResolvedExternalModuleRule[],
    moduleName: string,
    fileName?: string,
    packageName?: string
): ResolvedExternalModuleRule | undefined {
    const candidates = [moduleName, packageName, fileName]
        .filter((value): value is string => value !== undefined)
        .flatMap((value) => {
            const normalized = normalizePath(value);
            return normalized === value ? [value] : [value, normalized];
        });

    return rules.find((rule) =>
        candidates.some((candidate) => rule.matcher.match(candidate))
    );
}

export function getExternalNoResolvePatterns(options: CompilerOptions): string[] {
    const rules = normalizeExternalRules(options.externals);
    const explicitNoResolve = rules
        .filter((rule) => rule.mode !== "copy")
        .map((rule) => rule.pattern);

    return [...new Set([...(options.noResolvePaths ?? []), ...explicitNoResolve])];
}

export function getPackageNameFromFile(fileName: string): string | undefined {
    const parts = normalizePath(fileName).split("/");
    const nodeModulesIndex = parts.lastIndexOf("node_modules");
    if (nodeModulesIndex === -1 || nodeModulesIndex === parts.length - 1) {
        return undefined;
    }

    const firstPart = parts[nodeModulesIndex + 1];
    if (firstPart.startsWith("@") && nodeModulesIndex + 2 < parts.length) {
        return `${firstPart}/${parts[nodeModulesIndex + 2]}`;
    }

    return firstPart;
}

function findPackageRoot(fileName: string): string | undefined {
    let current = path.dirname(fileName);
    while (true) {
        const packageJsonPath = path.join(current, "package.json");
        if (existsSync(packageJsonPath)) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}

function collectPackageRuntimeEntries(value: unknown, entries: string[]) {
    if (typeof value === "string") {
        entries.push(value);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => collectPackageRuntimeEntries(entry, entries));
        return;
    }

    if (value && typeof value === "object") {
        Object.values(value).forEach((entry) =>
            collectPackageRuntimeEntries(entry, entries)
        );
    }
}

function inspectPackageRuntime(packageRoot: string) {
    const packageJsonPath = path.join(packageRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
        return undefined;
    }

    const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8")
    ) as Record<string, unknown>;
    const runtimeEntries: string[] = [];

    collectPackageRuntimeEntries(packageJson.main, runtimeEntries);
    collectPackageRuntimeEntries(packageJson.module, runtimeEntries);
    collectPackageRuntimeEntries(packageJson.exports, runtimeEntries);
    collectPackageRuntimeEntries(
        (packageJson as Record<string, unknown>).tstl,
        runtimeEntries
    );

    const normalizedEntries = runtimeEntries
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    return {
        packageJsonPath,
        runtimeEntries: normalizedEntries,
        hasLuaRuntime: normalizedEntries.some(
            (entry) => entry.endsWith(".lua") || entry.endsWith(".luau")
        ),
        hasJavaScriptRuntime: normalizedEntries.some((entry) =>
            /\.(c|m)?jsx?$/.test(entry)
        ),
    };
}

export function collectCompatibilityDiagnostics(
    program: ts.Program,
    options: CompilerOptions
): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    const builtInModules = new Set(options.builtInModules ?? []);
    const externalRules = normalizeExternalRules(options.externals);
    const seenUnsupportedPackages = new Set<string>();

    for (const sourceFile of program.getSourceFiles()) {
        if (
            sourceFile.isDeclarationFile ||
            program.isSourceFileFromExternalLibrary(sourceFile)
        ) {
            continue;
        }

        const visit = (node: ts.Node) => {
            let moduleSpecifier: string | undefined;
            if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
                moduleSpecifier = node.moduleSpecifier.text;
            } else if (
                ts.isExportDeclaration(node) &&
                node.moduleSpecifier &&
                ts.isStringLiteral(node.moduleSpecifier)
            ) {
                moduleSpecifier = node.moduleSpecifier.text;
            } else if (
                ts.isImportEqualsDeclaration(node) &&
                ts.isExternalModuleReference(node.moduleReference) &&
                ts.isStringLiteral(node.moduleReference.expression)
            ) {
                moduleSpecifier = node.moduleReference.expression.text;
            }

            if (moduleSpecifier) {
                const matchesRule = findMatchingExternalRule(
                    externalRules,
                    moduleSpecifier
                );
                if (
                    isNodeBuiltinModule(moduleSpecifier) &&
                    !builtInModules.has(moduleSpecifier) &&
                    matchesRule?.mode !== "builtin" &&
                    matchesRule?.mode !== "external"
                ) {
                    diagnostics.push(
                        nodeBuiltinRequiresExternalization(moduleSpecifier)
                    );
                }

                const resolvedModule = ts.resolveModuleName(
                    moduleSpecifier,
                    sourceFile.fileName,
                    program.getCompilerOptions(),
                    ts.sys
                ).resolvedModule;
                if (
                    resolvedModule &&
                    resolvedModule.resolvedFileName.endsWith(".d.ts") &&
                    resolvedModule.resolvedFileName.includes("node_modules")
                ) {
                    const packageRoot = findPackageRoot(
                        resolvedModule.resolvedFileName
                    );
                    if (packageRoot) {
                        const packageRuntime = inspectPackageRuntime(packageRoot);
                        const siblingLua = resolvedModule.resolvedFileName.replace(
                            /\.d\.ts$/,
                            ".lua"
                        );
                        const hasSiblingLua = existsSync(siblingLua);
                        const unsupportedPackageKey = `${moduleSpecifier}:${packageRoot}`;
                        if (
                            !hasSiblingLua &&
                            packageRuntime?.hasJavaScriptRuntime &&
                            !packageRuntime.hasLuaRuntime &&
                            !seenUnsupportedPackages.has(unsupportedPackageKey)
                        ) {
                            diagnostics.push(
                                unsupportedJavaScriptPackage(
                                    moduleSpecifier,
                                    normalizePath(
                                        path.relative(
                                            program.getCurrentDirectory(),
                                            packageRuntime.packageJsonPath
                                        )
                                    )
                                )
                            );
                            seenUnsupportedPackages.add(unsupportedPackageKey);
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        ts.forEachChild(sourceFile, visit);
    }

    return diagnostics;
}

export function formatAnalysisReport(
    analysis: BuilderAnalysis,
    format: AnalysisFormat = "text",
    explain: string[] = []
): string {
    if (format === "json") {
        return JSON.stringify(analysis, null, 2);
    }

    const explainSet = new Set(explain);
    const lines = [
        "Build analysis",
        ...analysis.entrypoints.map(
            (entry) =>
                `- ${entry.entry}: ${entry.bundledModules.length} bundled, ${entry.copiedModules.length} copied, ${entry.externalModules.length} external, ${entry.builtInModules.length} built-in, ${entry.size} bytes`
        ),
    ];

    if (analysis.copiedFiles.length > 0) {
        lines.push("Copied runtime files:");
        lines.push(
            ...analysis.copiedFiles.map(
                (file) => `- ${file.moduleName} -> ${file.outputPath}`
            )
        );
    }

    const filteredDependencies =
        explainSet.size === 0
            ? analysis.dependencies
            : analysis.dependencies.filter((dependency) =>
                  explainSet.has(dependency.moduleName)
              );

    if (filteredDependencies.length > 0) {
        lines.push(explainSet.size === 0 ? "Dependencies:" : "Explain:");
        lines.push(
            ...filteredDependencies.map((dependency) => {
                const matchedRule = dependency.matchedRule
                    ? ` (rule: ${dependency.matchedRule.pattern})`
                    : "";
                const location = dependency.fileName
                    ? ` [${normalizePath(dependency.fileName)}]`
                    : "";
                return `- ${dependency.moduleName}: ${dependency.kind}${matchedRule}${location} - ${dependency.reason}`;
            })
        );
    }

    if (analysis.warnings.length > 0) {
        lines.push("Warnings:");
        lines.push(...analysis.warnings.map((warning) => `- ${warning}`));
    }

    return lines.join("\n");
}
