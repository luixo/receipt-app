import { faker } from "@faker-js/faker";
import { createTRPCClient } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";

import type { CurrencyCode } from "~app/utils/currency";
import type { GetLinksOptions, Headers } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import type { TestContext } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import { getFreePort } from "~utils/port";
import { createContext } from "~web/handlers/context";

export const getRandomCurrencyCode = (): CurrencyCode =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export const getTestClient = <R extends AnyTRPCRouter>(
	ctx: TestContext,
	url: string,
	{
		captureError,
		headers,
		useBatch,
	}: {
		captureError?: GetLinksOptions["captureError"];
		headers?: Headers;
		useBatch?: boolean;
	} = {},
) =>
	createTRPCClient<R>({
		links: getLinks({
			debug: false,
			url,
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
	fn: (opts: { url: string }) => Promise<void>,
) => {
	const httpServer = createHTTPServer({
		router,
		createContext: (opts) =>
			// This context should not use database generally, so let's hope for the best
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			createContext(opts, { ...ctx, database: database!.instance }),
	});
	const port = await getFreePort();
	await new Promise<void>((resolve) => {
		httpServer.listen(port, resolve);
	});
	try {
		await fn({ url: `http://localhost:${port}` });
	} finally {
		await new Promise<void>((resolve, reject) => {
			httpServer.close((err) => (err ? reject(err) : resolve()));
		});
	}
};
