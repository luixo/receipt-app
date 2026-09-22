import { faker } from "@faker-js/faker";
import { createTRPCClient } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { entries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { GetLinksOptions, SimpleHeaders } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import type { TestContext } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import { promisifyServer, wait } from "~utils/promise";

export const getRandomCurrencyCode = (): CurrencyCode =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export const getTestClient = <R extends AnyTRPCRouter>(
	ctx: TestContext,
	url: URL,
	{
		captureError,
		headers,
		useBatch,
	}: {
		captureError?: GetLinksOptions["captureError"];
		headers?: SimpleHeaders;
		useBatch?: boolean;
	} = {},
) =>
	createTRPCClient<R>({
		links: getLinks({
			debug: false,
			url: url.toString(),
			source: "test",
			keepError: !captureError,
			useBatch,
			headers: {
				"x-test-id": ctx.task.id,
				...headers,
			},
			captureError: captureError || (() => "unknown"),
		}),
	});

export const withTestServer = async <R extends AnyTRPCRouter>(
	{ database, ...ctx }: TestContext,
	router: R,
	fn: (opts: { url: URL }) => Promise<void>,
) => {
	const httpServer = promisifyServer(
		createHTTPServer({
			router,
			createContext: (opts) => ({
				...ctx,
				// This context should not use database generally, so let's hope for the best
				// oxlint-disable-next-line typescript/no-non-null-assertion
				database: database!.instance,
				reqHeaders: new Headers(
					entries(opts.req.headers).filter(
						(entry): entry is [string, string] => typeof entry[1] === "string",
					),
				),
				resHeaders: new Headers(),
			}),
		}),
	);
	try {
		await fn({ url: await httpServer.listen(0) });
	} finally {
		await httpServer.close();
	}
};

export const runInBand = <T extends readonly (() => Promise<unknown>)[] | []>(
	promiseFns: T,
) =>
	Promise.all(
		promiseFns.map(async (promiseFn, index) => {
			await wait(50 * index);
			return promiseFn();
		}),
	) as Promise<{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }>;
