import type * as trpcNext from "@trpc/server/adapters/next";
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "node:crypto";
import { Pool } from "pg";
import { v4 } from "uuid";

import { getDatabase } from "next-app/db";
import { getDatabaseConfig } from "next-app/db/config";
import type { AccountsId } from "next-app/db/models";
import type { Logger } from "next-app/utils/logger";
import { baseLogger } from "next-app/utils/logger";
import type { TestContext } from "next-tests/utils/test";

type TestContextPicks = Pick<
	TestContext,
	"emailOptions" | "database" | "getSalt" | "getUuid"
>;

export type UnauthorizedContext = {
	req: NextApiRequest;
	res: NextApiResponse;
	logger: Logger;
} & TestContextPicks;

export type AuthorizedContext = UnauthorizedContext & {
	auth: {
		sessionId: string;
		accountId: AccountsId;
		email: string;
	};
};

const sharedPool = new Pool(getDatabaseConfig());

const defaultGetSalt = () => crypto.randomBytes(64).toString("hex");
const defaultGetUuid = () => v4();

export const createContext = (
	opts: trpcNext.CreateNextContextOptions & Partial<TestContextPicks>,
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
	getSalt: opts.getSalt || defaultGetSalt,
	getUuid: opts.getUuid || defaultGetUuid,
});
