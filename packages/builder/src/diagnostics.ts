import { createSerialDiagnosticFactory } from "@cc-ts/typescript-to-lua/dist/utils";
import ts from "typescript";

const createDiagnosticFactory = <TArgs extends any[]>(
    getMessage: (...args: TArgs) => string,
    category: ts.DiagnosticCategory = ts.DiagnosticCategory.Error
) =>
    createSerialDiagnosticFactory((...args: TArgs) => ({
        messageText: getMessage(...args),
        category,
    }));

export const luaBundleNotAllowed = createDiagnosticFactory(
    () => "'luaBundle' from tstl is incompatible with cc-ts"
);

export const serveRequiresWatch = createDiagnosticFactory(
    () => "'serve' requires watch to be enabled"
);
