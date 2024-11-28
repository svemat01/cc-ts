import kleur from "kleur";

import type { App, AppAction, AppExec } from "../types/apps.js";
import { runAction } from "../utils/templates.js";
import { initNPMProject } from "../utils/npm.js";

const actions: AppAction[] = [
    {
        type: "template",
        path: "bundled-app",
    },
    {
        type: "npm",
        dependencies: [],
        devDependencies: [
            "@jackmacwindows/craftos-types",
            "@jackmacwindows/cc-types",
            "@jackmacwindows/lua-types",
            "@cc-ts/typescript-to-lua",
            "@cc-ts/builder",
            "typescript@^5.7.2",
        ],
        extendPackageJson: {
            scripts: {
                build: "cc-ts",
                watch: "cc-ts --watch",
                dev: "cc-ts --watch --serve",
            },
        },
    },
];

const run: AppExec = async (targetDirectory, _arguments) => {
    await initNPMProject(targetDirectory);

    for (const action of actions) {
        await runAction(action, targetDirectory, _arguments);
    }

    return "Finished creating bundled app project";
};

export default {
    name: "Bundled App",
    color: kleur.blue,
    exec: run,
} satisfies App;
