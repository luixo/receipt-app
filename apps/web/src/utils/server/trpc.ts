import * as crypto from "node:crypto";
import { doNothing } from "remeda";
import { v4 } from "uuid";

import { getDatabase } from "~db/database";
import type { UnauthorizedContext } from "~web/handlers/context";
import { baseLogger } from "~web/providers/logger";
import { env } from "~web/utils/env";

/* c8 ignore start */
export const createServerContext = (req: Request): UnauthorizedContext => {
	const active = env.EMAIL_SERVICE_ACTIVE;
	if (active && !env.BASE_URL) {
		throw new Error(
			"Expected to have env variable BASE_URL while creating context with active email",
		);
	}
	return {
		logger: baseLogger,
		database: getDatabase({
			logger: req.headers.get("x-debug")
				? baseLogger.child({ url: req.url || "unknown" })
				: undefined,
			connectionString: env.DATABASE_URL,
			sharedKey: "tRPC",
		}),
		emailOptions: {
			getActive: () => active,
			setActive: () => {
				doNothing();
			},
		},
		baseUrl: env.BASE_URL || "http://example.com/",
		cacheDbOptions: {},
		exchangeRateOptions: {},
		s3Options: {},
		getSalt: () => crypto.randomBytes(64).toString("hex"),
		getUuid: () => v4(),
		reqHeaders: req.headers,
		resHeaders: new Headers(),
	};
};
/* c8 ignore stop */
