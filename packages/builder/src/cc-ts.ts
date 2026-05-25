#!/usr/bin/env bun
import * as cliDiagnostics from "@jackmacwindows/typescript-to-lua/dist/cli/diagnostics";
import {
    createDiagnosticReporter,
    getEmitOutDir,
    getProjectRoot,
} from "@jackmacwindows/typescript-to-lua";
import { locateConfigFile } from "@jackmacwindows/typescript-to-lua/dist/cli/tsconfig";
import * as performance from "@jackmacwindows/typescript-to-lua/dist/measure-performance";
import * as tstl from "@jackmacwindows/typescript-to-lua";
import * as path from "path";
import { mkdirSync, writeFileSync } from "node:fs";
import ts from "typescript";

import { getHelpString, versionString } from "./cli/information";
import { parseCommandLine } from "./cli/parse";
import {
    createConfigFileUpdater,
    parseConfigFileWithSystem,
} from "./cli/tsconfig";
import { formatAnalysisReport } from "./analysis";
import { CCTranspiler } from "./transpiler";
import { type CompilerOptions } from "./CompilerOptions";
import type { Server } from "bun";
import { logger } from "./logger";
import { getInvalidatedSourceFiles } from "./watch";

const shouldBePretty = ({ pretty }: ts.CompilerOptions = {}) =>
    pretty !== undefined
        ? (pretty as boolean)
        : ts.sys.writeOutputIsTTY?.() ?? false;

let reportDiagnostic = createDiagnosticReporter(false);
function updateReportDiagnostic(options?: ts.CompilerOptions): void {
    reportDiagnostic = createDiagnosticReporter(shouldBePretty(options));
}

function createWatchStatusReporter(
    options?: ts.CompilerOptions
): ts.WatchStatusReporter {
    return ts.createWatchStatusReporter(ts.sys, shouldBePretty(options));
}

function executeCommandLine(args: string[]): void {
    if (args.length > 0 && args[0].startsWith("-")) {
        const firstOption = args[0]
            .slice(args[0].startsWith("--") ? 2 : 1)
            .toLowerCase();
        if (firstOption === "build" || firstOption === "b") {
            return performBuild(args.slice(1));
        }
    }

    const commandLine = parseCommandLine(args);

    if (commandLine.options.build) {
        reportDiagnostic(
            cliDiagnostics.optionBuildMustBeFirstCommandLineArgument()
        );
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    // TODO: ParsedCommandLine.errors isn't meant to contain warnings. Once root-level options
    // support would be dropped it should be changed to `commandLine.errors.length > 0`.
    if (
        commandLine.errors.some(
            (e) => e.category === ts.DiagnosticCategory.Error
        )
    ) {
        commandLine.errors.forEach(reportDiagnostic);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    if (commandLine.options.version) {
        console.log(versionString);
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    if (commandLine.options.help) {
        console.log(versionString);
        console.log(getHelpString());
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    const configFileName = locateConfigFile(commandLine);
    if (typeof configFileName === "object") {
        reportDiagnostic(configFileName);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    const commandLineOptions = commandLine.options;
    if (configFileName) {
        const configParseResult = parseConfigFileWithSystem(
            configFileName,
            commandLineOptions
        );

        updateReportDiagnostic(configParseResult.options);
        if (configParseResult.options.watch) {
            createWatchOfConfigFile(configFileName, commandLineOptions);
        } else {
            performCompilation(
                configParseResult.fileNames,
                configParseResult.projectReferences,
                configParseResult.options,
                ts.getConfigFileParsingDiagnostics(configParseResult)
            );
        }
    } else {
        updateReportDiagnostic(commandLineOptions);
        if (commandLineOptions.watch) {
            createWatchOfFilesAndCompilerOptions(
                commandLine.fileNames,
                commandLineOptions
            );
        } else {
            performCompilation(
                commandLine.fileNames,
                commandLine.projectReferences,
                commandLineOptions
            );
        }
    }
}

function performBuild(_args: string[]): void {
    console.log("Option '--build' is not supported.");
    return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
}

function performCompilation(
    rootNames: string[],
    projectReferences: readonly ts.ProjectReference[] | undefined,
    options: CompilerOptions,
    configFileParsingDiagnostics?: readonly ts.Diagnostic[]
): void {
    if (options.measurePerformance) performance.enableMeasurement();
    if (options.debug) logger.level = "debug";
    if (options.tstlVerbose) logger.level = "trace";

    performance.startSection("createProgram");

    const program = ts.createProgram({
        rootNames,
        options,
        projectReferences,
        configFileParsingDiagnostics,
    });
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

    performance.endSection("createProgram");

    const transpiler = new CCTranspiler();
    const { diagnostics: transpileDiagnostics, emitSkipped } = transpiler.emit({
        program,
    });

    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...preEmitDiagnostics,
        ...transpileDiagnostics,
    ]);
    diagnostics.forEach(reportDiagnostic);

    const buildInfo = transpiler.getBuildInfo();
    if (
        buildInfo &&
        (options.analyze || (options.explain?.length ?? 0) > 0)
    ) {
        const report = formatAnalysisReport(
            buildInfo.analysis,
            options.analyzeFormat ?? "text",
            options.explain ?? []
        );
        if (options.analyzeOutput) {
            const analysisOutputPath = path.isAbsolute(options.analyzeOutput)
                ? options.analyzeOutput
                : path.resolve(getProjectRoot(program), options.analyzeOutput);
            mkdirSync(path.dirname(analysisOutputPath), { recursive: true });
            writeFileSync(analysisOutputPath, report, "utf8");
        } else {
            console.log(report);
        }
    }

    if (options.measurePerformance) reportPerformance();

    const exitCode =
        diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error)
            .length === 0
            ? ts.ExitStatus.Success
            : emitSkipped
            ? ts.ExitStatus.DiagnosticsPresent_OutputsSkipped
            : ts.ExitStatus.DiagnosticsPresent_OutputsGenerated;

    return ts.sys.exit(exitCode);
}

function createWatchOfConfigFile(
    configFileName: string,
    optionsToExtend: CompilerOptions
): void {
    const watchCompilerHost = ts.createWatchCompilerHost(
        configFileName,
        optionsToExtend,
        ts.sys,
        ts.createSemanticDiagnosticsBuilderProgram,
        undefined,
        createWatchStatusReporter(optionsToExtend)
    );

    updateWatchCompilationHost(watchCompilerHost, optionsToExtend);
    ts.createWatchProgram(watchCompilerHost);
}

function createWatchOfFilesAndCompilerOptions(
    rootFiles: string[],
    options: CompilerOptions
): void {
    const watchCompilerHost = ts.createWatchCompilerHost(
        rootFiles,
        options,
        ts.sys,
        ts.createSemanticDiagnosticsBuilderProgram,
        undefined,
        createWatchStatusReporter(options)
    );

    updateWatchCompilationHost(watchCompilerHost, options);
    ts.createWatchProgram(watchCompilerHost);
}

function updateWatchCompilationHost(
    host: ts.WatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>,
    optionsToExtend: CompilerOptions
): void {
    let hadErrorLastTime = true;
    const updateConfigFile = createConfigFileUpdater(optionsToExtend);

    const transpiler = new CCTranspiler();
    let pendingChangedFiles = new Set<string>();

    const originalWatchFile = host.watchFile?.bind(host);
    if (originalWatchFile) {
        host.watchFile = (fileName, callback, pollingInterval, options) =>
            originalWatchFile(
                fileName,
                (changedFileName, eventKind, version) => {
                    pendingChangedFiles.add(path.normalize(changedFileName));
                    callback(changedFileName, eventKind, version);
                },
                pollingInterval,
                options
            );
    }

    const originalWatchDirectory = host.watchDirectory?.bind(host);
    if (originalWatchDirectory) {
        host.watchDirectory = (
            fileName,
            callback,
            recursive,
            options
        ) =>
            originalWatchDirectory(
                fileName,
                (changedFileName) => {
                    pendingChangedFiles.add(path.normalize(changedFileName));
                    callback(changedFileName);
                },
                recursive,
                options
            );
    }

    let server: Promise<Server<any>> | undefined = undefined;
    let currentPort: number | undefined = undefined;
    let currentEmitDir: string | undefined = undefined;

    async function createServer(emitDir: string, port: number = 8080) {
        // Only recreate if settings changed
        if (server && currentPort === port && currentEmitDir === emitDir) {
            return server;
        }

        if (server) {
            await server.then((s) => s.stop(true));
        }

        currentPort = port;
        currentEmitDir = emitDir;

        logger.info({ port, emitDir }, "Starting HTTP server");

        return Bun.serve({
            port,
            fetch(request, server) {
                // remove the leading slash
                const requestPath = path
                    .normalize(new URL(request.url).pathname)
                    .slice(1);
                const filePath = path.resolve(emitDir, requestPath);
                logger.info({ requestPath, filePath }, "Serving file");

                const file = Bun.file(filePath);
                return new Response(file);
            },
        });
    }

    host.afterProgramCreate = (builderProgram) => {
        const program = builderProgram.getProgram();
        const options = builderProgram.getCompilerOptions() as CompilerOptions;

        if (options.debug) logger.level = "debug";
        if (options.tstlVerbose) logger.level = "trace";

        if (options.serve) {
            server = createServer(getEmitOutDir(program), options.servePort);
        } else if (server) {
            server.then(async (s) => {
                logger.info("Stopping HTTP server");
                await s.stop(true);
                server = undefined;
            });
        }

        if (options.measurePerformance) performance.enableMeasurement();

        const configFileParsingDiagnostics: ts.Diagnostic[] =
            updateConfigFile(options);

        let sourceFiles: ts.SourceFile[] | undefined = undefined;
        if (!hadErrorLastTime && options.incremental) {
            const buildInfo = transpiler.getBuildInfo();
            if (buildInfo) {
                sourceFiles = getInvalidatedSourceFiles(
                    buildInfo.graph,
                    pendingChangedFiles,
                    program
                );
            }
        }
        pendingChangedFiles = new Set();

        const { diagnostics: emitDiagnostics } = transpiler.emit({
            program,
            sourceFiles,
        });

        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...configFileParsingDiagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSemanticDiagnostics(),
            ...emitDiagnostics,
        ]);

        diagnostics.forEach(reportDiagnostic);

        if (options.measurePerformance) reportPerformance();

        const errors = diagnostics.filter(
            (d) => d.category === ts.DiagnosticCategory.Error
        );
        hadErrorLastTime = errors.length > 0;

        host.onWatchStatusChange!(
            cliDiagnostics.watchErrorSummary(errors.length),
            host.getNewLine(),
            options
        );
    };
}

function reportPerformance() {
    if (performance.isMeasurementEnabled()) {
        console.log("Performance measurements: ");
        performance.forEachMeasure((name, duration) => {
            console.log(`  ${name}: ${duration.toFixed(2)}ms`);
        });
        console.log(`Total: ${performance.getTotalDuration().toFixed(2)}ms`);
        performance.disableMeasurement();
    }
}

function checkNodeVersion(): void {
    const [major, minor] = process.version.slice(1).split(".").map(Number);
    const isValid = major > 12 || (major === 12 && minor >= 13);
    if (!isValid) {
        console.error(
            `CC-TS requires Node.js >=12.13.0, the current version is ${process.version}`
        );
        process.exit(1);
    }
}

checkNodeVersion();

if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}

executeCommandLine(ts.sys.args);
