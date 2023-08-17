import * as trpcNext from "@trpc/server/adapters/next";
import { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";

import { Database, getDatabase } from "next-app/db";
import { getDatabaseConfig } from "next-app/db/config";
import { AccountsId } from "next-app/db/models";
import { Logger, baseLogger } from "next-app/utils/logger";

export type UnauthorizedContext = {
	req: NextApiRequest;
	res: NextApiResponse;
	logger: Logger;
	database: Database;
};

export type AuthorizedContext = UnauthorizedContext & {
	auth: {
		sessionId: string;
		accountId: AccountsId;
		email: string;
	};
};

const sharedPool = new Pool(getDatabaseConfig());

export const createContext = (
	opts: trpcNext.CreateNextContextOptions,
): UnauthorizedContext => ({
	req: opts.req,
	res: opts.res,
	logger: baseLogger,
	database: getDatabase({
		logger: opts.req.headers.debug
			? baseLogger.child({ url: opts.req.url || "unknown" })
			: undefined,
		pool: sharedPool,
	}),
});
