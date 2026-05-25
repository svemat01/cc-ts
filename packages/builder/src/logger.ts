import pino from "pino";

export const logger = pino({
    level: process.env.CCTS_LOG_LEVEL ?? "silent",
    transport: {
        target: "pino-pretty",
    },
});

export const setLoggerLevel = (level: pino.LevelWithSilent) => {
    logger.level = level;
};

// logger.level = "debug";
