import pino from "pino";

export const logger = pino({
	base: null,
	level: "info",
	timestamp: pino.stdTimeFunctions.epochTime,
});
