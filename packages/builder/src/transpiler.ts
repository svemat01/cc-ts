import * as tstl from "@cc-ts/typescript-to-lua";
import * as ts from "typescript";
import { resolveDependencies } from "@cc-ts/typescript-to-lua/dist/transpilation/resolve";
import * as performance from "@cc-ts/typescript-to-lua/dist/measure-performance";
import * as path from "node:path";
import { CCBundler } from "./bundler";
import { logger as _logger } from "./logger";
import { validateOptions, type CompilerOptions } from "./CompilerOptions";

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
    const logger = _logger.child({ module: "transpiler" });
    logger.info("Starting project transpilation");
    logger.debug("Creating program from parsed command line");

    const program = ts.createProgram({
        rootNames: parseResult.fileNames,
        options: parseResult.options,
        projectReferences: parseResult.projectReferences,
        configFileParsingDiagnostics:
            ts.getConfigFileParsingDiagnostics(parseResult),
    });

    logger.debug("Getting pre-emit diagnostics");
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

    logger.debug("Starting transpilation");
    const { diagnostics: transpileDiagnostics, emitSkipped } =
        new CCTranspiler().emit({
            program,
        });

    logger.trace("Sorting and deduplicating diagnostics");
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...preEmitDiagnostics,
        ...transpileDiagnostics,
    ]);

    if (diagnostics.length > 0) {
        logger.error("Transpilation failed with diagnostics");
        throw new TranspilationError(
            "Failed to transpile project",
            diagnostics
        );
    }

    logger.info("Project transpilation completed successfully");
    return {
        diagnostics,
        emitSkipped,
        program,
    };
};

export class CCTranspiler extends tstl.Transpiler {
    private logger = _logger.child({ class: "CCTranspiler" });

    constructor(options?: tstl.TranspilerOptions) {
        super(options);
    }

    protected getEmitPlan(
        program: ts.Program,
        diagnostics: ts.Diagnostic[],
        files: tstl.ProcessedFile[],
        plugins: tstl.Plugin[]
    ): { emitPlan: tstl.EmitFile[] } {
        this.logger.debug("Starting emit plan construction");
        performance.startSection("getEmitPlan");
        const options = program.getCompilerOptions() as CompilerOptions;

        if (options.tstlVerbose) {
            this.logger.trace("Verbose mode enabled");
        }

        const ccOptionsDiagnostics = validateOptions(options);
        diagnostics.push(...ccOptionsDiagnostics);

        this.logger.debug("Resolving dependencies");
        const resolutionResult = resolveDependencies(
            program,
            files,
            this.emitHost,
            plugins
        );
        diagnostics.push(...resolutionResult.diagnostics);

        this.logger.trace(
            "Filtering lualib placeholders from resolution result"
        );
        resolutionResult.resolvedFiles = resolutionResult.resolvedFiles.filter(
            (f) => f.fileName !== (options.luaLibName ?? "lualib_bundle")
        );

        let emitPlan: tstl.EmitFile[] = [];
        const sourceDir = tstl.getSourceDir(program);

        this.logger.debug("Creating bundler instance");
        const bundler = new CCBundler(
            resolutionResult.resolvedFiles,
            program,
            this.emitHost
        );

        this.logger.info(`Processing ${files.length} files`);
        for (const file of files) {
            const fileName = path.resolve(sourceDir, file.fileName);
            if (fileName.endsWith(".lib.ts")) {
                this.logger.trace(`Skipping library file`, { fileName });
                continue;
            }

            this.logger.trace(`Bundling module`, { fileName });
            const bundleResult = bundler.bundleModule(
                bundler.createModulePath(fileName)
            );
            emitPlan.push(bundleResult);
        }

        this.logger.debug("Emit plan construction completed");
        return { emitPlan };
    }
}
