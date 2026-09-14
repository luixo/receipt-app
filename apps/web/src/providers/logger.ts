import pino from "pino";
import pinoPretty from "pino-pretty";

export const baseLogger = pino(
	{ level: "info" },
	pinoPretty({
		colorize: true,
	}),
);

export { type Logger } from "pino";
