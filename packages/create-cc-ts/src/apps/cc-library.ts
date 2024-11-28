import kleur from "kleur";

import type { App, AppAction, AppExec } from "../types/apps.js";
import { runAction } from "../utils/templates.js";
import { initNPMProject } from "../utils/npm.js";

const actions: AppAction[] = [
    {
        type: "template",
        path: "cc-library",
    },
    {
        type: "npm",
        dependencies: [],
        devDependencies: [
            "@jackmacwindows/craftos-types",
            "@jackmacwindows/cc-types",
            "@jackmacwindows/lua-types",
            "@cc-ts/typescript-to-lua",
            "typescript@^5.7.2",
        ],
        extendPackageJson: {
            scripts: {
                build: "tstl",
                watch: "tstl --watch",
            },
        },
    },
];

const run: AppExec = async (targetDirectory, _arguments) => {
    await initNPMProject(targetDirectory);

    for (const action of actions) {
        await runAction(action, targetDirectory, _arguments);
    }

    return "Finished creating CC library";
};

export default {
    name: "CC Library",
    color: kleur.green,
    exec: run,
} satisfies App;
