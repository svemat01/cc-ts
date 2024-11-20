import * as tstl from "@jackmacwindows/typescript-to-lua";
import * as ts from "typescript";
import { resolveDependencies } from "@jackmacwindows/typescript-to-lua/dist/transpilation/resolve";
import * as performance from "@jackmacwindows/typescript-to-lua/dist/measure-performance";
import * as path from "node:path";
import { CCBundler } from "./bundler";
export class TranspilationError extends Error {
    constructor(
        message: string,
        public readonly diagnostics: readonly ts.Diagnostic[]
    ) {
        super(message);
        this.name = "TranspilationError";
    }

    public getDiagnosticsString(): string {
        return this.diagnostics
            .map((diagnostic) => {
                const message = ts.formatDiagnosticsWithColorAndContext(
                    [diagnostic],
                    {
                        getCurrentDirectory: () => process.cwd(),
                        getCanonicalFileName: (fileName) => fileName,
                        getNewLine: () => "\n",
                    }
                );
                return message;
            })
            .join("\n=====\n");
    }
}

export const transpileProjectFiles = async (
    parseResult: tstl.ParsedCommandLine
) => {
    const program = ts.createProgram({
        rootNames: parseResult.fileNames,
        options: parseResult.options,
        projectReferences: parseResult.projectReferences,
        configFileParsingDiagnostics:
            ts.getConfigFileParsingDiagnostics(parseResult),
    });
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

    const { diagnostics: transpileDiagnostics, emitSkipped } =
        new CCTranspiler().emit({
            program,
        });

    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...preEmitDiagnostics,
        ...transpileDiagnostics,
    ]);

    if (diagnostics.length > 0) {
        throw new TranspilationError(
            "Failed to transpile project",
            diagnostics
        );
    }

    return {
        diagnostics,
        emitSkipped,
        program,
    };
};

export class CCTranspiler extends tstl.Transpiler {
    constructor(options?: tstl.TranspilerOptions) {
        super(options);
    }

    protected getEmitPlan(
        program: ts.Program,
        diagnostics: ts.Diagnostic[],
        files: tstl.ProcessedFile[],
        plugins: tstl.Plugin[]
    ): { emitPlan: tstl.EmitFile[] } {
        performance.startSection("getEmitPlan");
        const options = program.getCompilerOptions() as tstl.CompilerOptions;

        if (options.tstlVerbose) {
            console.log("Constructing emit plan");
        }

        // Resolve imported modules and modify output Lua requires
        const resolutionResult = resolveDependencies(
            program,
            files,
            this.emitHost,
            plugins
        );
        diagnostics.push(...resolutionResult.diagnostics);

        // Remove lualib placeholders from resolution result
        resolutionResult.resolvedFiles = resolutionResult.resolvedFiles.filter(
            (f) => f.fileName !== (options.luaLibName ?? "lualib_bundle")
        );

        let emitPlan: tstl.EmitFile[] = [];
        const sourceDir = tstl.getSourceDir(program);

        const bundler = new CCBundler(
            resolutionResult.resolvedFiles,
            program,
            this.emitHost
        );

        for (const file of files) {
            const fileName = path.resolve(sourceDir, file.fileName);
            console.log({ fileName });
            const bundleResult = bundler.bundleModule(
                CCBundler.createModulePath(fileName, program)
            );
            emitPlan.push(bundleResult);
        }

        return { emitPlan };
    }
}
