import * as ts from "typescript";
import type { CompilerOptions as TSTLOptions } from "@cc-ts/typescript-to-lua";
import * as diagnosticFactories from "./diagnostics";

export interface CCTSOptions {
    builtInModules?: string[];
    minify?: boolean;
    serve?: boolean;
    servePort?: number;
    debug?: boolean;
    extraPaths?: string[];
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

export function validateOptions(options: CompilerOptions): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];

    if (options.luaBundle) {
        diagnostics.push(diagnosticFactories.luaBundleNotAllowed());
    }

    if (options.serve && !options.watch) {
        diagnostics.push(diagnosticFactories.serveRequiresWatch());
    }

    // Validate excludeFromBundle is an array of strings if provided
    if (
        options.ignoreAsEntryPoint !== undefined &&
        (!Array.isArray(options.ignoreAsEntryPoint) ||
            options.ignoreAsEntryPoint.some(
                (pattern) => typeof pattern !== "string"
            ))
    ) {
        diagnostics.push(diagnosticFactories.invalidIgnoreAsEntryPoint());
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
