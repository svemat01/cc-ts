import { isCancel, log, select } from "@clack/prompts";
import kleur from "kleur";

import type {
    App,
    AppAction,
    AppExec,
    BasicAppVariant,
} from "../types/apps.js";
import { extendPackageJson } from "../utils/npm.js";
import { runAction } from "../utils/templates.js";

const actions: AppAction[] = [
    {
        type: "files",
        path: "basic",
        dependencies: [],
        devDependencies: [
            "@cc-ts/craftos-types",
            "@jackmacwindows/cc-types",
            "@jackmacwindows/lua-types",
            "@jackmacwindows/typescript-to-lua",
            "@cc-ts/builder",
        ],
    },
    {
        type: "exec",
        exec: async (targetDirectory, _arguments) => {
            await extendPackageJson(targetDirectory, {
                scripts: {
                    build: "cc-ts build",
                    dev: "cc-ts dev",
                },
            });

            return "Extended package.json";
        },
    },
];

const run: AppExec = async (targetDirectory, _arguments) => {
    for (const action of actions) {
        await runAction(action, targetDirectory, _arguments);
    }

    return "Finished creating a basic project";
};

export default {
    name: "Basic",
    color: kleur.blue,
    exec: run,
} satisfies App;
