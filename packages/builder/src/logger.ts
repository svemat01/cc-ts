import pino from "pino";

export const logger = pino({
    transport: {
        target: "pino-pretty",
    },
});

export const setLoggerLevel = (level: pino.Level) => {
    logger.level = level;
};

// logger.level = "debug";
