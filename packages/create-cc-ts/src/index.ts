#!/usr/bin/env bun

import * as p from "@clack/prompts";
import kleur from "kleur";
import { red } from "kleur/colors";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadApps } from "./utils/apps.js";
import { showHelp } from "./utils/help.js";
import { exit, PromptError } from "./utils/prompts.js";
import { parseArgs } from "util";

const argv = parseArgs({
    args: process.argv.slice(2),
    options: {
        help: {
            type: "boolean",
            alias: "h",
        },
        version: {
            type: "boolean",
            alias: "v",
        },
    },
    allowPositionals: true,
});

export type ParsedArgs = typeof argv;

const apps = await loadApps();

const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url).pathname, "utf8")
) as {
    version: string;
};

/**
 * ====================
 * Global options
 * and help
 * ====================
 */

if (argv.values.help) {
    await showHelp(apps);
    process.exit(0);
}

if (argv.values.version) {
    console.log(packageJson.version);
    process.exit(0);
}

/**
 * ====================
 * Init prompts
 * ====================
 */

let [targetDirectory] = argv.positionals;

console.log(kleur.dim(`create-cc-ts version ${packageJson.version}\n`));

p.intro(kleur.bgCyan().black(" Create CC-TS "));

/**
 * ====================
 * Select project location
 * ====================
 */

if (!targetDirectory) {
    const directory = await p.text({
        message: "Where should we create your project?",
        placeholder: "  (hit Enter to use current directory)",
    });

    if (p.isCancel(directory)) exit("Cancelled");

    targetDirectory = directory ? (directory as string) : ".";
}

targetDirectory = resolve(targetDirectory);

if (existsSync(targetDirectory)) {
    const force = await p.confirm({
        message: `${kleur.red("Directory not empty")}. Continue anyway?`,
        initialValue: false,
    });

    if (p.isCancel(force)) exit("Cancelled");

    if (!force) exit("Cancelled", 0);
}

/**
 * ====================
 * Select a app
 * ====================
 */

const selectedAppIndex = await p.select({
    message: "Select an app type",
    options: Object.entries(apps).map(([name, app]) => ({
        label: app.color?.(app.name) ?? app.name,
        value: name,
    })),
});

if (p.isCancel(selectedAppIndex)) exit("Cancelled");

const selectedApp = apps[selectedAppIndex as string];

/**
 * ====================
 * Run the app
 * ====================
 */

const outroText = await selectedApp
    .exec(targetDirectory, argv)
    .catch((error) => {
        if (error instanceof PromptError) {
            exit(red(error.message), 1);
        }

        throw error;
    });

/**
 * ====================
 * Outro
 * ====================
 */

p.outro(outroText ?? kleur.green("Done!"));
