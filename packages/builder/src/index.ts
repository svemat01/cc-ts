#!/usr/bin/env bun
import { isAbsolute, normalize } from 'node:path';
import { resolve } from 'node:path';
import yargs, { type CommandModule } from "yargs";
import { hideBin } from "yargs/helpers";
import { build, watchProject } from "./build.ts";
import { LOGGER_LEVELS, LOGGER_LEVEL, log, setLoggerLevel } from './logger.ts';

await yargs(hideBin(process.argv))
    // add --minify flag to both commands
    .option("minify", {
        alias: "m",
        type: "boolean",
        default: false,
        description: "Minify the bundle",
    })
    // add --debug flag to both commands
    .option("debug", {
        type: "boolean",
        default: false,
        description: "Run in debug mode",
        coerce: (debug) => {
            if (debug && LOGGER_LEVEL < LOGGER_LEVELS.debug) {
                setLoggerLevel("debug");
            }
            return debug;
        }
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Run with verbose logging",
        // set the LOGGER_LEVEL environment variable to "verbose" if the verbose flag is set
        coerce: (verbose) => {
            if (verbose && LOGGER_LEVEL < LOGGER_LEVELS.verbose) {
                setLoggerLevel("verbose");
            }
            return verbose;
        },
    })
    .command(
        "build",
        "Build the project",
        (yargs) => yargs,
        async (args) => {
            await build({
                minify: args.minify,
                debug: args.debug,
            });
        }
    )
    .command(
        "dev [dir]",
        "Start the development server",
        (yargs) =>
            yargs.positional("dir", {
                type: "string",
                default: ".",
                description: "Directory to watch",
            }).option("port", {
                alias: "p",
                type: "number",
                default: 8080,
                description: "Port to serve on",
            }).option('srcDir', {
                type: 'string',
                default: 'src',
                description: 'Directory to watch',
            }),
        async (args) => {
            const dirAbs = isAbsolute(args.dir) ? args.dir : resolve(process.cwd(), args.dir);

            log.info(`Serving ${dirAbs}/dist on port ${args.port}`);
            Bun.serve({
                port: args.port,
                fetch(request, server) {
                    // remove the leading slash
                    const requestPath = normalize(new URL(request.url).pathname).slice(1);
                    const filePath = resolve(dirAbs, 'dist/', requestPath);
                    console.log({
                        requestPath,
                        filePath,
                        dirAbs,
                    });

                    const file = Bun.file(filePath);
                    return new Response(file)
                },
            })
            log.info(`Watching ${dirAbs}`);
            await watchProject(
                {
                    rootDir: args.dir,
                    minify: args.minify,
                    debug: args.debug,
                },
                resolve(dirAbs, args.srcDir),
            );

        }
    )
    .demandCommand(1, "You need at least one command before moving on")
    .help()
    .strict()
    .parse();
