import type { inferProcedureBuilderResolverOptions } from "@trpc/server";
import type { StandardSchemaV1 } from "@trpc/server/unstable-core-do-not-import";

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
	baseUrl: string;
};

export type NetContext = {
	reqHeaders: Headers;
	resHeaders: Headers;
};

export type UnauthorizedContext = NetContext & TestContextPicks;

export type HandlerVersion<Input = unknown, Output = Input> = readonly [
	number,
	StandardSchemaV1<Input, Output>,
];

type SchemaInput<Schema> = Schema extends StandardSchemaV1
	? NonNullable<Schema["~standard"]["types"]>["input"]
	: never;

type SchemaOutput<Schema> = Schema extends StandardSchemaV1
	? NonNullable<Schema["~standard"]["types"]>["output"]
	: never;

type VersionOutput<Version> = Version extends readonly [number, infer Schema]
	? SchemaOutput<Schema>
	: never;

type LastVersionOutput<Versions extends readonly HandlerVersion[]> =
	Versions extends readonly [...HandlerVersion[], infer Last]
		? VersionOutput<Last>
		: never;

type IsCompatibleChain<
	Versions extends readonly HandlerVersion[],
	PreviousOutput = never,
> = Versions extends readonly []
	? true
	: Versions extends readonly [infer Head, ...infer Tail]
		? Head extends HandlerVersion
			? Tail extends readonly HandlerVersion[]
				? [PreviousOutput] extends [never]
					? IsCompatibleChain<Tail, VersionOutput<Head>>
					: [PreviousOutput] extends [SchemaInput<Head[1]>]
						? IsCompatibleChain<Tail, VersionOutput<Head>>
						: false
				: false
			: false
		: false;

export type ValidateHandlerVersions<
	Latest extends StandardSchemaV1,
	Versions extends readonly HandlerVersion[],
> =
	IsCompatibleChain<Versions> extends true
		? [LastVersionOutput<Versions>] extends [SchemaInput<Latest>]
			? Versions
			: never
		: never;

export const defineHandlerVersions =
	<Latest extends StandardSchemaV1>(
		// oxlint-disable-next-line no-unused-vars
		_latestSchema: Latest,
	) =>
	<const Versions extends readonly HandlerVersion[]>(
		versions: Versions & ValidateHandlerVersions<Latest, Versions>,
	) =>
		versions;

export type HandlerMeta = {
	title: string;
	description: string;
	versions?: readonly HandlerVersion[];
};

export type AuthorizedContext = inferProcedureBuilderResolverOptions<
	typeof authProcedure
>["ctx"];
