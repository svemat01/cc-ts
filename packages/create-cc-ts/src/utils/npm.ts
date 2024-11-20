import { log, spinner } from "@clack/prompts";

import { PromptError } from "./prompts.js";
import { $ } from "bun";
import { execa } from 'execa';

/**
 * Initialize a new npm project
 * @param targetDirectory The directory to initialize the project in
 */
export const init = async (targetDirectory: string) => {
    await Bun.write(targetDirectory + '/package.json', JSON.stringify({
        name: "my-app",
        module: "src/index.ts",
        type: "module",
        devDependencies: {},
        dependencies: {}
    }, null, 2));
    await Bun.write(targetDirectory + '/README.md', '# My App\n\nCreated with create-cc-ts');
    await Bun.write(targetDirectory + '/.gitignore', 'node_modules/\n.DS_Store\ndist/\n.env');
};

const _addDependencies = async (
    targetDirectory: string,
    dependencies: string[],
    saveAs: "dependencies" | "devDependencies"
) => {
    return await execa(
        "bun",
        [
            "add",
            saveAs === "dependencies" ? "" : "--dev",
            ...dependencies,
        ],
        {
            cwd: targetDirectory,
        }
    );
    // log.info(`bun add ${saveAs === 'dependencies' ? '' : '--dev'} ${dependencies.join(' ')}`)
    // return await $`bun add ${saveAs === 'dependencies' ? '' : '--dev'} ${dependencies.join(' ')}`.cwd(targetDirectory).quiet();
    // switch (packageMangager) {
    //     case 'pnpm':
    //         return await execa(
    //             'pnpm',
    //             [
    //                 'install',
    //                 saveAs === 'dependencies' ? '--save' : '--save-dev',
    //                 ...dependencies,
    //             ],
    //             {
    //                 cwd: targetDirectory,
    //             }
    //         );

    //     case 'yarn':
    //         return await execa(
    //             'yarn',
    //             [
    //                 'add',
    //                 saveAs === 'devDependencies' ? '--dev' : '',
    //                 ...dependencies,
    //             ],
    //             {
    //                 cwd: targetDirectory,
    //             }
    //         );

    //     case 'npm':
    //         return await execa(
    //             'npm',
    //             [
    //                 'install',
    //                 saveAs === 'devDependencies' ? '--save-dev' : '--save',
    //                 ...dependencies,
    //             ],
    //             {
    //                 cwd: targetDirectory,
    //             }
    //         );
    // }
};

/**
 * Add dependencies to a project
 * @param config Configuration object
 */
export const addDependencies = async (config: {
    targetDirectory: string;
    dependencies?: string[];
    devDependencies?: string[];
}) => {
    const { targetDirectory, dependencies, devDependencies } = config;

    const s = spinner();

    if (dependencies && dependencies.length > 0) {
        s.start("Installing dependencies...");

        const result = await _addDependencies(
            targetDirectory,
            dependencies,
            "dependencies"
        );

        if (result.exitCode !== 0) {
            log.info("yeet");
            log.error(result.stdout.toString());
            log.error(result.stderr.toString());

            throw new PromptError("Failed to install dependencies");
        }

        s.stop("Dependencies installed");
    }

    if (devDependencies && devDependencies.length > 0) {
        s.start("Installing dev dependencies...");

        const result = await _addDependencies(
            targetDirectory,
            devDependencies,
            "devDependencies"
        );

        if (result.exitCode !== 0) {
            log.info("yeet");
            log.error(result.stdout.toString());
            log.error(result.stderr.toString());

            throw new PromptError("Failed to install dev dependencies");
        }

        s.stop("Dev dependencies installed");
    }
};

/**
 * Extend the package.json file in a directory
 * @param targetDirectory The directory to extend the package.json file in
 * @param data The data to extend the package.json file with
 */
export const extendPackageJson = async (
    targetDirectory: string,
    data: Record<string, unknown>
) => {
    const packageJsonFile = Bun.file(`${targetDirectory}/package.json`);
    console.log(packageJsonFile);

    const packageJson = await packageJsonFile.json();

    await Bun.write(
        packageJsonFile,
        JSON.stringify(
            {
                ...packageJson,
                ...data,
            },
            undefined,
            4
        )
    );
};
