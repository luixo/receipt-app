import type * as trpcNext from "@trpc/server/adapters/next";
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "node:crypto";
import { v4 } from "uuid";

import type { CacheDbOptions } from "next-app/cache-db";
import { getDatabase } from "next-app/db";
import type { AccountsId } from "next-app/db/models";
import type { EmailOptions } from "next-app/providers/email";
import type { ExchangeRateOptions } from "next-app/providers/exchange-rate";
import { getPool } from "next-app/providers/pg";
import type { Logger } from "next-app/utils/logger";
import { baseLogger } from "next-app/utils/logger";
import type { TestContext } from "next-tests/utils/test";

type TestContextPicks = Pick<
	TestContext,
	"database" | "getSalt" | "getUuid"
> & {
	logger: Logger;
	emailOptions: EmailOptions;
	cacheDbOptions: CacheDbOptions;
	exchangeRateOptions: ExchangeRateOptions;
};

export type UnauthorizedContext = {
	req: NextApiRequest;
	res: NextApiResponse;
} & TestContextPicks;

export type AuthorizedContext = UnauthorizedContext & {
	auth: {
		sessionId: string;
		accountId: AccountsId;
		email: string;
	};
};

const defaultGetSalt = () => crypto.randomBytes(64).toString("hex");
const defaultGetUuid = () => v4();
const defaultGetDatabase = (req: NextApiRequest) =>
	getDatabase({
		logger: req.headers.debug
			? baseLogger.child({ url: req.url || "unknown" })
			: undefined,
		pool: getPool(),
	});
const defaultGetEmailOptions = () => ({
	active: Boolean(process.env.NO_EMAIL_SERVICE),
});
const defaultGetCacheDbOptions = () => ({});
const defaultGetExchangeRateOptions = () => ({});
const defaultLogger = baseLogger;

export const createContext = (
	opts: trpcNext.CreateNextContextOptions & Partial<TestContextPicks>,
): UnauthorizedContext => ({
	req: opts.req,
	res: opts.res,
	logger: opts.logger || defaultLogger,
	database: opts.database || defaultGetDatabase(opts.req),
	emailOptions: opts.emailOptions || defaultGetEmailOptions(),
	cacheDbOptions: opts.cacheDbOptions || defaultGetCacheDbOptions(),
	exchangeRateOptions:
		opts.exchangeRateOptions || defaultGetExchangeRateOptions(),
	getSalt: opts.getSalt || defaultGetSalt,
	getUuid: opts.getUuid || defaultGetUuid,
});
