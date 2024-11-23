import { resolve } from "node:path";

import { logger } from "./logger.ts";
import { TranspilationError, transpileProjectFiles } from "./transpiler.ts";
import { watch } from "node:fs/promises";
import { parseConfigFileWithSystem } from "@cc-ts/typescript-to-lua";

export type BuildConfig = {
    /**
     * Path to main project directory
     * @default "."
     */
    rootDir?: string;

    /**
     * Path to output directory relative to rootDir
     * @default "dist"
     */
    outDir?: string;

    /**
     * Path to tsconfig.json relative to rootDir
     * @default "tsconfig.json"
     */
    tsconfigPath?: string;

    minify?: boolean;
    debug?: boolean;
};

const defaultConfig: Required<BuildConfig> = {
    rootDir: ".",
    outDir: "dist",

    tsconfigPath: "tsconfig.json",

    minify: false,
    debug: false,
};

const checkGitIgnore = async (dir: string) => {
    const gitignorePath = resolve(dir, ".gitignore");

    const shouldBeIgnored = [".ccts-builder", "dist"];

    // Warn if the .gitignore file doesn't exist or doesn't contain the necessary lines
};

export const build = async (_config: BuildConfig) => {
    const config = {
        ...defaultConfig,
        ..._config,
    };

    const rootDir = resolve(process.cwd(), config.rootDir);
    const tsconfigPath = resolve(rootDir, config.tsconfigPath);

    const parseResult = parseConfigFileWithSystem(tsconfigPath);

    logger.info(`Transpiling project`);

    await transpileProjectFiles(parseResult).catch((err) => {
        if (err instanceof TranspilationError) {
            logger.error(err.message);
            console.log(err.getDiagnosticsString());
            throw err;
        } else {
            throw err;
        }
    });

    logger.info(`Done!`);
};

export const watchProject = async (config: BuildConfig, dir: string) => {
    await build(config);

    const watcher = watch(dir, {
        recursive: true,
    });

    for await (const event of watcher) {
        await build(config).catch((err) => {
            console.error(err);
        });
    }
};
