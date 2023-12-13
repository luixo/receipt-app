import type * as trpcNext from "@trpc/server/adapters/next";
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "node:crypto";
import { v4 } from "uuid";

import type { TestContext } from "@tests/backend/utils/test";
import { getDatabase } from "next-app/db";
import type { AccountsId } from "next-app/db/models";
import type { CacheDbOptions } from "next-app/providers/cache-db";
import type { EmailOptions } from "next-app/providers/email";
import type { ExchangeRateOptions } from "next-app/providers/exchange-rate";
import type { Logger } from "next-app/providers/logger";
import { baseLogger } from "next-app/providers/logger";
import { getPool } from "next-app/providers/pg";
import type { S3Options } from "next-app/providers/s3";

type TestContextPicks = Pick<
	TestContext,
	"database" | "getSalt" | "getUuid"
> & {
	logger: Logger;
	emailOptions: EmailOptions;
	cacheDbOptions: CacheDbOptions;
	exchangeRateOptions: ExchangeRateOptions;
	s3Options: S3Options;
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

/* c8 ignore start */
const defaultGetSalt = () => crypto.randomBytes(64).toString("hex");
const defaultGetUuid = () => v4();
const defaultGetDatabase = (req: NextApiRequest) =>
	getDatabase({
		logger: req.headers.debug
			? baseLogger.child({ url: req.url || "unknown" })
			: undefined,
		pool: getPool(),
	});
const defaultGetEmailOptions = () => {
	const active = Boolean(process.env.NO_EMAIL_SERVICE);
	if (active && !process.env.BASE_URL) {
		throw new Error(
			`Expected to have env variable BASE_URL while creating context with active email`,
		);
	}
	return {
		active: Boolean(process.env.NO_EMAIL_SERVICE),
		baseUrl: process.env.BASE_URL || "http://example.com/",
	};
};
const defaultGetCacheDbOptions = () => ({});
const defaultGetExchangeRateOptions = () => ({});
const defaultGetS3Options = () => ({});
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
	s3Options: opts.s3Options || defaultGetS3Options(),
	getSalt: opts.getSalt || defaultGetSalt,
	getUuid: opts.getUuid || defaultGetUuid,
});
/* c8 ignore stop */
