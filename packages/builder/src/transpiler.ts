import * as tstl from "@jackmacwindows/typescript-to-lua";
import * as ts from "typescript";
import { resolveDependencies } from "@jackmacwindows/typescript-to-lua/dist/transpilation/resolve";
import * as performance from "@jackmacwindows/typescript-to-lua/dist/measure-performance";
import * as path from "node:path";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { CCBundler } from "./bundler";
import { logger as _logger } from "./logger";
import {
    validateOptions,
    type CompilerOptions,
    DEFAULT_IGNORE_AS_ENTRY_POINT,
} from "./CompilerOptions";
import { Glob } from "bun";
import {
    collectCompatibilityDiagnostics,
    formatAnalysisReport,
    getExternalNoResolvePatterns,
    type BuilderBuildInfo,
    type BuilderEmitFile,
} from "./analysis";

const normalizeGlobPath = (filePath: string) => filePath.replaceAll("\\", "/");

const matchesIgnorePattern = (
    pattern: Glob,
    fileName: string,
    sourceDir: string,
    projectRoot: string
) => {
    const candidatePaths = [
        fileName,
        path.relative(projectRoot, fileName),
        path.relative(sourceDir, fileName),
    ]
        .map(normalizeGlobPath)
        .filter(
            (candidate, index, candidates) =>
                candidate.length > 0 &&
                !candidate.startsWith("../") &&
                candidate !== ".." &&
                candidates.indexOf(candidate) === index
        );

    return candidatePaths.some((candidate) => pattern.match(candidate));
};

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

export interface BuilderTranspileResult {
    diagnostics: readonly ts.Diagnostic[];
    emitSkipped: boolean;
    program: ts.Program;
    buildInfo?: BuilderBuildInfo;
}

export const transpileProjectFiles = async (
    parseResult: tstl.ParsedCommandLine
): Promise<BuilderTranspileResult> => {
    const logger = _logger.child({ module: "transpiler" });
    logger.info("Starting project transpilation");
    logger.debug("Creating program from parsed command line");

    const options = {
        ...(parseResult.options as CompilerOptions),
    } as CompilerOptions;
    options.noResolvePaths = getExternalNoResolvePatterns(options);

    const program = ts.createProgram({
        rootNames: parseResult.fileNames,
        options,
        projectReferences: parseResult.projectReferences,
        configFileParsingDiagnostics:
            ts.getConfigFileParsingDiagnostics(parseResult),
    });

    logger.debug("Getting pre-emit diagnostics");
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

    logger.debug("Starting transpilation");
    const transpiler = new CCTranspiler();
    const { diagnostics: transpileDiagnostics, emitSkipped } = transpiler.emit({
        program,
    });

    logger.trace("Sorting and deduplicating diagnostics");
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...preEmitDiagnostics,
        ...transpileDiagnostics,
    ]);

    const buildInfo = transpiler.getBuildInfo();

    if (buildInfo && (options.analyze || (options.explain?.length ?? 0) > 0)) {
        const format = options.analyzeFormat ?? "text";
        const report = formatAnalysisReport(
            buildInfo.analysis,
            format,
            options.explain ?? []
        );

        if (options.analyzeOutput) {
            const analysisOutputPath = path.isAbsolute(options.analyzeOutput)
                ? options.analyzeOutput
                : path.resolve(
                      tstl.getProjectRoot(program),
                      options.analyzeOutput
                  );
            await mkdir(path.dirname(analysisOutputPath), { recursive: true });
            await writeFile(analysisOutputPath, report, "utf8");
        } else {
            console.log(report);
        }
    }

    if (
        diagnostics.some(
            (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
        )
    ) {
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
        buildInfo,
    };
};

export class CCTranspiler extends tstl.Transpiler {
    private logger = _logger.child({ class: "CCTranspiler" });
    private lastBuildInfo?: BuilderBuildInfo;

    constructor(options?: tstl.TranspilerOptions) {
        super(options);
    }

    public getBuildInfo(): BuilderBuildInfo | undefined {
        return this.lastBuildInfo;
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
        diagnostics.push(...collectCompatibilityDiagnostics(program, options));

        this.logger.debug("Resolving dependencies");
        const resolutionResult = resolveDependencies(
            program,
            files,
            this.emitHost,
            plugins
        );
        diagnostics.push(...resolutionResult.diagnostics);

        const filteredResolutionFiles = resolutionResult.resolvedFiles.filter(
            (f) => f.fileName !== (options.luaLibName ?? "lualib_bundle")
        );
        this.logger.trace(
            "Filtering lualib placeholders from resolution result"
        );
        resolutionResult.resolvedFiles = filteredResolutionFiles;

        let emitPlan: BuilderEmitFile[] = [];
        const sourceDir = tstl.getSourceDir(program);
        const projectRoot = tstl.getProjectRoot(program);

        this.logger.debug("Creating bundler instance");
        const bundler = new CCBundler(
            resolutionResult.resolvedFiles,
            program,
            this.emitHost,
            diagnostics
        );

        const entryModuleMap = new Map<string, string>();

        this.logger.info(`Processing ${files.length} files`);
        const ignorePatterns = (
            options.ignoreAsEntryPoint || DEFAULT_IGNORE_AS_ENTRY_POINT
        ).map((pattern) => new Glob(pattern));
        for (const file of files) {
            const fileName = path.isAbsolute(file.fileName)
                ? file.fileName
                : path.resolve(sourceDir, file.fileName);

            // Support both absolute and project-relative glob patterns.
            const shouldIgnore = ignorePatterns.some((pattern) => {
                return matchesIgnorePattern(
                    pattern,
                    fileName,
                    sourceDir,
                    projectRoot
                );
            });

            if (shouldIgnore) {
                this.logger.trace(`Skipping file as entry point`, { fileName });
                continue;
            }

            this.logger.trace(`Bundling module`, { fileName });
            const entryModule = bundler.createModulePath(fileName);
            entryModuleMap.set(entryModule, fileName);
            const bundleResult = bundler.bundleModule(
                entryModule
            );
            if (bundleResult) {
                emitPlan.push(bundleResult);
            }
        }

        for (const copiedDependency of bundler.getCopiedDependencies().values()) {
            emitPlan.push({
                outputPath: copiedDependency.outputPath,
                code: readFileSync(copiedDependency.fileName, "utf8"),
            });
        }

        const graph = bundler.createGraphSnapshot(entryModuleMap);
        const analysis = bundler.createAnalysis(graph, emitPlan);
        this.lastBuildInfo = {
            analysis,
            emitPlan,
            graph,
            diagnostics,
        };

        this.logger.debug("Emit plan construction completed");
        return { emitPlan };
    }
}
