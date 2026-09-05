import pino from "pino";
import pinoPretty from "pino-pretty";

import { env } from "~web/utils/env";

export const baseLogger = pino(
	{
		level: env.VERCEL ? "trace" : "info",
	},
	pinoPretty({
		colorize: true,
	}),
);

export { type Logger } from "pino";
