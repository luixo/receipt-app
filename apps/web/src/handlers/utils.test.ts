import { faker } from "@faker-js/faker";
import type { CreateTRPCClientOptions } from "@trpc/client";
import { createTRPCClient } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import { assert } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import type { GetLinksOptions, Headers } from "~app/utils/trpc";
import { getLinks, transformer } from "~app/utils/trpc";
import type { TestContext } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import { createContext } from "~web/handlers/context";

export const getRandomCurrencyCode = (): CurrencyCode =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export const getClientServer = async <R extends AnyTRPCRouter>(
	ctx: TestContext,
	router: R,
	{
		captureError,
		headers,
		useBatch,
	}: {
		captureError?: GetLinksOptions["captureError"];
		headers?: Headers;
		useBatch?: boolean;
	} = {},
) => {
	const port = (await findFreePorts())[0];
	assert(port);
	const httpServer = createHTTPServer({
		router,
		createContext: (opts) => createContext(opts, ctx),
	});
	return {
		client: createTRPCClient<R>({
			links: getLinks({
				debug: false,
				url: `http://localhost:${port}`,
				source: "test",
				keepError: !captureError,
				useBatch,
				headers: {
					"x-test-id": ctx.task.id,
					...headers,
				},
				captureError: captureError || (() => "unknown"),
			}),
			transformer,
		} as unknown as CreateTRPCClientOptions<R>),
		withServer: async (fn: () => Promise<void>) => {
			await new Promise<void>((resolve) => {
				httpServer.listen(port, resolve);
			});
			try {
				await fn();
			} finally {
				await new Promise<void>((resolve, reject) => {
					httpServer.close((err) => (err ? reject(err) : resolve()));
				});
			}
		},
	};
};
