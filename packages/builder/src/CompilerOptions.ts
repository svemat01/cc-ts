import * as ts from "typescript";
import type { CompilerOptions as TSTLOptions } from "@cc-ts/typescript-to-lua";
import * as diagnosticFactories from "./diagnostics";

export interface CCTSOptions {
    builtInModules?: string[];
    minify?: boolean;
    serve?: boolean;
    servePort?: number;
    debug?: boolean;
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

    return diagnostics;
}

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
