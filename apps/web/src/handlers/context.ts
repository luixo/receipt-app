import { type H3Event, createEvent } from "@tanstack/react-start/server";
import type { inferProcedureBuilderResolverOptions } from "@trpc/server";
import type { TRPCRequestInfo } from "@trpc/server/http";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Database } from "~db/database";
import type { TestContext } from "~tests/backend/utils/test";
import type { authProcedure } from "~web/handlers/trpc";
import type { CacheDbOptions } from "~web/providers/cache-db";
import type { EmailOptions } from "~web/providers/email";
import type { ExchangeRateOptions } from "~web/providers/exchange-rate";
import type { Logger } from "~web/providers/logger";
import type { S3Options } from "~web/providers/s3";

type TestContextPicks = Pick<TestContext, "getSalt" | "getUuid"> & {
	database: Database;
	logger: Logger;
	emailOptions: EmailOptions;
	cacheDbOptions: CacheDbOptions;
	exchangeRateOptions: ExchangeRateOptions;
	s3Options: S3Options;
};

export type NetContext = {
	event: H3Event;
	info: TRPCRequestInfo;
};

export type UnauthorizedContext = NetContext & TestContextPicks;

export type AuthorizedContext = inferProcedureBuilderResolverOptions<
	typeof authProcedure
>["ctx"];

export const createContext = (
	{
		req,
		res,
		info,
	}: { req: IncomingMessage; res: ServerResponse; info: TRPCRequestInfo },
	testContext: TestContextPicks,
): UnauthorizedContext => ({
	info,
	event: createEvent(req, res),
	...testContext,
});
