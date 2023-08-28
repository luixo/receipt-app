import type * as trpcNext from "@trpc/server/adapters/next";
import type { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";

import type { Database } from "next-app/db";
import { getDatabase } from "next-app/db";
import { getDatabaseConfig } from "next-app/db/config";
import type { AccountsId } from "next-app/db/models";
import type { EmailOptions } from "next-app/utils/email";
import type { Logger } from "next-app/utils/logger";
import { baseLogger } from "next-app/utils/logger";

export type UnauthorizedContext = {
	req: NextApiRequest;
	res: NextApiResponse;
	logger: Logger;
	database: Database;
	emailOptions: EmailOptions;
};

type TestContextKeys = "emailOptions" | "database";

export type AuthorizedContext = UnauthorizedContext & {
	auth: {
		sessionId: string;
		accountId: AccountsId;
		email: string;
	};
};

const sharedPool = new Pool(getDatabaseConfig());

export const createContext = (
	opts: trpcNext.CreateNextContextOptions &
		Partial<Pick<UnauthorizedContext, TestContextKeys>>,
): UnauthorizedContext => ({
	req: opts.req,
	res: opts.res,
	logger: baseLogger,
	database:
		opts.database ||
		getDatabase({
			logger: opts.req.headers.debug
				? baseLogger.child({ url: opts.req.url || "unknown" })
				: undefined,
			pool: sharedPool,
		}),
	emailOptions: opts.emailOptions || {
		active: Boolean(process.env.NO_EMAIL_SERVICE),
		broken: false,
	},
});
