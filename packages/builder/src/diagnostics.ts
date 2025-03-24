import { createDiagnosticFactoryWithCode } from "@cc-ts/typescript-to-lua/dist/utils";
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
