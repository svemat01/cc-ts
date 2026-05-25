import * as ts from "typescript";
import type { CompilerOptions as TSTLOptions } from "@jackmacwindows/typescript-to-lua";
import type { AnalysisFormat, ExternalModuleRule } from "./analysis";
import * as diagnosticFactories from "./diagnostics";

export interface CCTSOptions {
    builtInModules?: string[];
    minify?: boolean;
    serve?: boolean;
    servePort?: number;
    debug?: boolean;
    extraPaths?: string[];
    analyze?: boolean;
    analyzeFormat?: AnalysisFormat;
    analyzeOutput?: string;
    explain?: string[];
    externals?: ExternalModuleRule[];
    reproducible?: boolean;
    /**
     * Glob patterns for files to exclude from being treated as entry points.
     * Files matching these patterns will still be included when imported by other modules.
     * Example: ["\*\*\/*.lib.ts", "src/utils/**"]
     */
    ignoreAsEntryPoint?: string[];
}

export type CompilerOptions = TSTLOptions &
    CCTSOptions & {
        [option: string]: any;
    };

const validAnalyzeFormats = new Set<AnalysisFormat>(["text", "json"]);
const validExternalModes = new Set(["builtin", "external", "copy"]);

export function validateOptions(options: CompilerOptions): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];

    if (options.luaBundle) {
        diagnostics.push(diagnosticFactories.luaBundleNotAllowed());
    }

    if (options.serve && !options.watch) {
        diagnostics.push(diagnosticFactories.serveRequiresWatch());
    }

    // Validate ignoreAsEntryPoint is an array of strings if provided
    if (
        options.ignoreAsEntryPoint !== undefined &&
        (!Array.isArray(options.ignoreAsEntryPoint) ||
            options.ignoreAsEntryPoint.some(
                (pattern) => typeof pattern !== "string"
            ))
    ) {
        diagnostics.push(diagnosticFactories.invalidIgnoreAsEntryPoint());
    }

    if (
        options.explain !== undefined &&
        (!Array.isArray(options.explain) ||
            options.explain.some((pattern) => typeof pattern !== "string"))
    ) {
        diagnostics.push(diagnosticFactories.invalidExplain());
    }

    if (
        options.externals !== undefined &&
        (!Array.isArray(options.externals) ||
            options.externals.some((rule) => {
                if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
                    return true;
                }

                const candidate = rule as ExternalModuleRule;
                return (
                    typeof candidate.pattern !== "string" ||
                    (candidate.mode !== undefined &&
                        !validExternalModes.has(candidate.mode)) ||
                    (candidate.outDir !== undefined &&
                        typeof candidate.outDir !== "string") ||
                    (candidate.reason !== undefined &&
                        typeof candidate.reason !== "string")
                );
            }))
    ) {
        diagnostics.push(diagnosticFactories.invalidExternals());
    }

    if (
        options.analyzeFormat !== undefined &&
        !validAnalyzeFormats.has(options.analyzeFormat)
    ) {
        diagnostics.push(diagnosticFactories.invalidAnalyzeFormat());
    }

    if (options.minify && (options.sourceMap || options.sourceMapTraceback)) {
        diagnostics.push(diagnosticFactories.minifyWithSourceMapsNotSupported());
    }

    return diagnostics;
}

/**
 * Default patterns to exclude from being built as separate entry points.
 * These patterns will still be included if imported by other modules.
 */
export const DEFAULT_IGNORE_AS_ENTRY_POINT = ["**/*.lib.ts"];

const DEFAULT_BUILT_IN_MODULES = [
    "cc.audio.dfpwm",
    "cc.completion",
    "cc.expect",
    "cc.image.nft",
    "cc.pretty",
    "cc.require",
    "cc.shell.completion",
    "cc.strings",
];

export const getBuiltInModules = (options: CompilerOptions) => {
    return options.builtInModules
        ? [...DEFAULT_BUILT_IN_MODULES, ...options.builtInModules]
        : DEFAULT_BUILT_IN_MODULES;
};
