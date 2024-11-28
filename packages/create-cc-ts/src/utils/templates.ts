import { spinner } from "@clack/prompts";
import kleur from "kleur";
import { join } from "node:path";

import type { AppAction } from "../types/apps.js";
import { copy, mkdirp } from "./files.js";
import { addDependencies, extendPackageJson, initNPMProject } from "./npm.js";
import { PromptError } from "./prompts.js";
import type { ParsedArgs } from "../index.js";

/**
 * Copy a template to a target directory
 * @param path Path to template files relative to the templates directory
 * @param targetDirectory Destination directory
 */
export const copyTemplate = async (path: string, targetDirectory: string) => {
    const sourcePath = join(
        new URL("../../templates", import.meta.url).pathname,
        path
    );

    try {
        await copy(sourcePath, targetDirectory);
    } catch {
        throw new PromptError("Failed to copy template files");
    }
};

export const runAction = async (
    action: AppAction,
    targetDirectory: string,
    arguments_: ParsedArgs
) => {
    switch (action.type) {
        case "template": {
            const s = spinner();

            s.start("Copying files");
            await copyTemplate(action.path, targetDirectory);
            s.stop("Copied files");

            break;
        }
        case "npm": {
            if (action.extendPackageJson) {
                const s = spinner();

                s.start("Updating package.json");
                await extendPackageJson(
                    targetDirectory,
                    action.extendPackageJson
                );

                s.stop("Updated package.json");
            }

            await addDependencies({
                targetDirectory,
                dependencies: action.dependencies,
                devDependencies: action.devDependencies,
            });

            break;
        }
        case "command": {
            const s = spinner();

            s.start(action.startMsg);

            const commandResult = await action.command().cwd(targetDirectory);

            if (commandResult.exitCode !== 0) {
                throw new PromptError(
                    kleur.red(
                        `${action.startMsg} failed: ${commandResult.stderr}`
                    )
                );
            }

            s.stop(action.stopMsg);

            break;
        }
        case "exec": {
            return action.exec(targetDirectory, arguments_);
        }
    }
};
