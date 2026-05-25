import {
    executeCommand,
    parseCliArgs,
    printHelp,
    type Command,
} from "@cc-ts/helpers/utils/cli-parser";

import config from "./data/showcase.json";
import { printLines, printSection, printStructured } from "./shared/print";
import {
    printSessionResult,
    printTelemetrySnapshot,
    runShowcaseSession,
} from "./shared/session";
import { readShowcaseState, resetShowcaseState } from "./shared/state";

const commands: Command[] = [
    {
        name: "session",
        description: "Run or inspect the persisted showcase workflow",
        subcommands: [
            {
                name: "run",
                description: "Execute the sample workflow",
                positionalArgs: [
                    {
                        name: "label",
                        description: "Optional label for the run",
                    },
                ],
                action: (args) => {
                    const label =
                        typeof args._[0] === "string"
                            ? args._[0]
                            : "manual-demo";
                    printSessionResult(runShowcaseSession(label));
                },
            },
            {
                name: "show",
                description: "Print the current persisted state",
                action: () => {
                    printStructured("Persisted State", readShowcaseState());
                },
            },
            {
                name: "reset",
                description: "Reset the persisted state file",
                action: () => {
                    printStructured("Reset State", resetShowcaseState());
                },
            },
        ],
    },
    {
        name: "telemetry",
        description: "Print a structured OTEL snapshot",
        action: () => {
            printTelemetrySnapshot("main-command");
        },
    },
    {
        name: "network",
        description: "Explain the rednet helper entrypoint",
        action: () => {
            printLines("Network Entrypoint", [
                "Run dist/network.lua on a computer with a modem.",
                `It looks up protocol '${config.network.protocol}' and host '${config.network.hostname}'.`,
                "Then it sends a tx-tagged request and waits for a matching response.",
            ]);
        },
    },
    {
        name: "timers",
        description: "Explain the scheduler entrypoint",
        action: () => {
            printLines("Timers Entrypoint", [
                "Run dist/timers.lua to exercise scheduler helpers.",
                "It uses asyncSleep, waitForEvent, custom event typing, and AbortController.",
                "Press q to abort early or Enter to finish the demo.",
            ]);
        },
    },
    {
        name: "help",
        description: "Show the command list",
        action: () => {
            printHelp(undefined, commands);
        },
    },
];

function printLanding(): void {
    printSection(config.projectName);
    printLines("What This Example Covers", [
        "builder multi-entry bundles",
        "copied Lua runtime files via externals",
        "JSON config imports",
        "persisted state + Sandcorn IDs",
        "typed event emitters + proxy instrumentation",
        "OTEL logs and metrics helpers",
        "rednet helpers and scheduler helpers in separate entrypoints",
    ]);
    printHelp(undefined, commands);
}

const args = parseCliArgs([...$vararg]);
if (args._.length === 0) {
    printLanding();
} else {
    executeCommand(args, commands);
}
