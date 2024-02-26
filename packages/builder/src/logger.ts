import { createLogger } from "@lvksh/logger";
import k from "kleur";

export const LOGGER_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
} satisfies Record<string, number>;

export let LOGGER_LEVEL =
    LOGGER_LEVELS[Bun.env["LOGGER_LEVEL"] as keyof typeof LOGGER_LEVELS] ?? LOGGER_LEVELS.info;

export function setLoggerLevel(level: keyof typeof LOGGER_LEVELS) {
    LOGGER_LEVEL = LOGGER_LEVELS[level];
}

export const log = createLogger(
    {
        error: {
            label: k.red("[ERROR]"),
            tags: ["error"],
        },
        warn: {
            label: k.yellow("[WARN]"),
            tags: ["warn"],
        },
        info: {
            label: k.green("[INFO]"),
            tags: ["info"],
        },
        debug: {
            label: k.blue("[DEBUG]"),
            tags: ["debug"],
        },
        verbose: {
            label: k.gray("[VERB]"),
            tags: ["verbose"],
        },
    },
    {
        padding: "PREPEND",
        filter: () =>
            Object.keys(LOGGER_LEVELS).filter(
                (level) =>
                    LOGGER_LEVELS[level as keyof typeof LOGGER_LEVELS] <=
                    (LOGGER_LEVEL ?? LOGGER_LEVELS.info)
            ),
    },
    console.log
);
