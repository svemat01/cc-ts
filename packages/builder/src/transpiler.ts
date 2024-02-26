import { formatDiagnosticsWithColorAndContext, type Diagnostic } from 'typescript';
import { LuaLibImportKind, LuaTarget, transpileProject } from '@jackmacwindows/typescript-to-lua';

export class TranspilationError extends Error {
    constructor(message: string, public readonly diagnostics: readonly Diagnostic[]) {
        super(message);
        this.name = "TranspilationError";
    }

    public getDiagnosticsString(): string {
        return this.diagnostics.map((diagnostic) => {
            const message = formatDiagnosticsWithColorAndContext(
                [diagnostic],
                {
                    getCurrentDirectory: () => process.cwd(),
                    getCanonicalFileName: (fileName) => fileName,
                    getNewLine: () => "\n",
                }
            );
            return message;
        }).join("\n=====\n");
    }
}

export const transpileProjectFiles = async (tsconfigPath: string, outDir: string) => {
    const result = transpileProject(tsconfigPath, {
        luaTarget: LuaTarget.Cobalt,
        luaLibImport: LuaLibImportKind.RequireMinimal,
        outDir,
    });

    if (result.diagnostics.length > 0) {
        throw new TranspilationError(
            "Failed to transpile project",
            result.diagnostics
        );
    }
}