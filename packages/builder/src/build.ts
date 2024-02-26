import { resolve, relative } from "node:path";
import * as tstl from "@jackmacwindows/typescript-to-lua";

import { Glob } from "bun";
import { log } from './logger.ts';
import { TranspilationError, transpileProjectFiles } from './transpiler.ts';
import { bundleProjectFiles } from './bundler.ts';
import { rm, watch, writeFile } from 'node:fs/promises';

export type BuildConfig = {
    /** 
     * Path to main project directory 
     * @default "."
    */
    rootDir?: string;

    /**
     * Path to extra lua files to include in the bundle
     * @default "lua"
     */
    luaDir?: string;
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
    luaDir: "lua",
    outDir: "dist",

    tsconfigPath: "tsconfig.json",

    minify: false,
    debug: false,
};

const checkGitIgnore = async (dir: string) => {
    const gitignorePath = resolve(dir, ".gitignore");

    const shouldBeIgnored = [
        ".ccts-builder",
        "dist",
    ];

    // Warn if the .gitignore file doesn't exist or doesn't contain the necessary lines
    
}

export const build = async (_config: BuildConfig) => {
    const config = {
        ...defaultConfig,
        ..._config,
    };


    const rootDir = resolve(process.cwd(), config.rootDir);
    const outDir = resolve(rootDir, config.outDir);
    const luaDir = resolve(rootDir, config.luaDir);
    const tsconfigPath = resolve(rootDir, config.tsconfigPath);

    // Make temp .ccts-builder directory in rootDir
    const tempDir = resolve(rootDir, ".ccts-builder/tstl-comp");

    if (luaDir && luaDir !== tempDir) {
        const glob = new Glob("**/*.lua");

        for await (const filepath of glob.scan({
            cwd: luaDir,
        })) {
            log.verbose(`Copying lua file: ${filepath}`)
            const file = Bun.file(`${luaDir}/${filepath}`);
            await Bun.write(`${tempDir}/${filepath}`, file);
        }
    }

    log.info(`Transpiling project`);

    try {
        await transpileProjectFiles(tsconfigPath, tempDir);
    } catch (error) {
        if (error instanceof TranspilationError) {
            log.error(error.message)
            console.log(error.getDiagnosticsString());
        } else {
            throw error;
        }

        return;
    }

    log.info(`Bundling project`);

    await bundleProjectFiles({
        srcDir: tempDir,
        outDir,
        minify: config.minify,
        noEmit: false,
    })

    log.info(`Done!`);

    if (!config.debug) {
        await rm(tempDir, {
            recursive: true,
        });
    }
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
}
