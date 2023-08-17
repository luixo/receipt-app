import pino, { Logger } from "pino";
import pinoPretty from "pino-pretty";

export const baseLogger = pino(
	{
		level: process.env.VERCEL ? "trace" : "info",
	},
	pinoPretty({
		colorize: true,
	}),
);
export type { Logger };
