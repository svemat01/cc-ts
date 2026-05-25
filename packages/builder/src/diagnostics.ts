import { createDiagnosticFactoryWithCode } from "@jackmacwindows/typescript-to-lua/dist/utils";
import ts from "typescript";

const createDiagnosticFactory = <TArgs extends any[]>(
    code: number,
    getMessage: (...args: TArgs) => string,
    category: ts.DiagnosticCategory = ts.DiagnosticCategory.Error
) =>
    createDiagnosticFactoryWithCode(code, (...args: TArgs) => ({
        messageText: getMessage(...args),
        category,
        source: "@cc-ts/builder",
    }));

export const luaBundleNotAllowed = createDiagnosticFactory(
    90001,
    () =>
        "The 'luaBundle' option from typescript-to-lua has no effect when using cc-ts builder.\n" +
        "cc-ts uses its own custom bundling implementation instead."
);

export const serveRequiresWatch = createDiagnosticFactory(
    90002,
    () =>
        "The 'serve' command requires watch mode to be enabled.\n" +
        "Please add the --watch flag or enable watch mode in your configuration."
);

export const entryModuleNotFound = createDiagnosticFactory(
    90003,
    (moduleName: string) =>
        `Could not find entry module '${moduleName}'.\n` +
        "Make sure the entry point exists and is correctly specified in your configuration."
);

export const moduleNotFound = createDiagnosticFactory(
    90004,
    (moduleName: string, isDependency: boolean) => {
        const baseMessage = `Could not find module '${moduleName}'`;
        if (isDependency) {
            return (
                baseMessage +
                " which is required as a dependency.\n" +
                "Please ensure all required modules are installed and properly configured."
            );
        }
        return (
            baseMessage +
            ".\nVerify that the module exists and the import path is correct."
        );
    }
);

export const invalidIgnoreAsEntryPoint = createDiagnosticFactory(
    90005,
    () => "Option 'ignoreAsEntryPoint' must be an array of strings."
);

export const invalidExplain = createDiagnosticFactory(
    90006,
    () => "Option 'explain' must be an array of strings."
);

export const invalidExternals = createDiagnosticFactory(
    90007,
    () =>
        "Option 'externals' must be an array of objects with a string 'pattern' and optional 'mode', 'outDir', and 'reason'."
);

export const minifyWithSourceMapsNotSupported = createDiagnosticFactory(
    90008,
    () =>
        "Minification is not compatible with source maps or source-map traceback in @cc-ts/builder yet.\nDisable 'minify', 'sourceMap', or 'sourceMapTraceback'."
);

export const invalidAnalyzeFormat = createDiagnosticFactory(
    90009,
    () => "Option 'analyzeFormat' must be either 'text' or 'json'."
);

export const unsupportedJavaScriptPackage = createDiagnosticFactory(
    90010,
    (moduleName: string, packageJsonPath: string) =>
        `Package '${moduleName}' appears to publish JavaScript runtime files without a Lua runtime entry.\n` +
        `Checked package metadata at '${packageJsonPath}'.\n` +
        "Try a TSTL-compatible package, a .lua + .d.ts package, vendored TypeScript source, or an explicit external rule.",
    ts.DiagnosticCategory.Warning
);

export const nodeBuiltinRequiresExternalization = createDiagnosticFactory(
    90011,
    (moduleName: string) =>
        `Module '${moduleName}' is a Node builtin and is not available in ComputerCraft by default.\n` +
        "Add it to 'builtInModules' or configure it through 'externals' if runtime code will provide it.",
    ts.DiagnosticCategory.Warning
);

export const copiedExternalModuleMissing = createDiagnosticFactory(
    90012,
    (moduleName: string) =>
        `Module '${moduleName}' was configured to be copied as an external runtime dependency, but no resolved Lua source was available to emit.\n` +
        "Check the package layout or change the external rule mode to 'external'."
);
