import type { inferProcedureBuilderResolverOptions } from "@trpc/server";

import type { Database } from "#db/database.ts";
import type { TestContext } from "#tests/backend/utils/test.ts";
import type { authProcedure } from "#web/handlers/trpc.ts";
import type { CacheDbOptions } from "#web/providers/cache-db.ts";
import type { EmailOptions } from "#web/providers/email.ts";
import type { ExchangeRateOptions } from "#web/providers/exchange-rate.ts";
import type { Logger } from "#web/providers/logger.ts";
import type { S3Options } from "#web/providers/s3.ts";

type TestContextPicks = Pick<TestContext, "getSalt" | "getUuid"> & {
	database: Database;
	logger: Logger;
	emailOptions: EmailOptions;
	cacheDbOptions: CacheDbOptions;
	exchangeRateOptions: ExchangeRateOptions;
	s3Options: S3Options;
	baseUrl: string;
};

export type NetContext = {
	reqHeaders: Headers;
	resHeaders: Headers;
};

export type UnauthorizedContext = NetContext & TestContextPicks;

export type HandlerMeta = {
	title: string;
	description: string;
};

export type AuthorizedContext = inferProcedureBuilderResolverOptions<
	typeof authProcedure
>["ctx"];
