import type { inferProcedureBuilderResolverOptions } from "@trpc/server";
import type { TRPCRequestInfo } from "@trpc/server/http";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { TestContext } from "~tests/backend/utils/test";
import type { authProcedure } from "~web/handlers/trpc";
import type { CacheDbOptions } from "~web/providers/cache-db";
import type { EmailOptions } from "~web/providers/email";
import type { ExchangeRateOptions } from "~web/providers/exchange-rate";
import type { Logger } from "~web/providers/logger";
import type { S3Options } from "~web/providers/s3";

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

export type NetContext = {
	req: IncomingMessage;
	res: ServerResponse;
	info: TRPCRequestInfo;
};

export type UnauthorizedContext = NetContext & TestContextPicks;

export type AuthorizedContext = inferProcedureBuilderResolverOptions<
	typeof authProcedure
>["ctx"];

export const createContext = (
	netContext: NetContext,
	testContext: TestContextPicks,
): UnauthorizedContext => ({ ...netContext, ...testContext });
