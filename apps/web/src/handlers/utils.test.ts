import { faker } from "@faker-js/faker";
import type { CreateTRPCClientOptions } from "@trpc/client";
import { createTRPCClient } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { NextApiRequest, NextApiResponse } from "next";
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
		createContext: ({ req, res }) => {
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			const isBatchCall = Boolean(url.searchParams.get("batch"));
			const input = url.searchParams.get("input");
			assert(input, "expected to have input in searchParam");
			const inputs = (JSON.parse(input) || {}) as Record<number, unknown>;
			const paths = isBatchCall
				? decodeURIComponent(url.pathname.slice(1)).split(",")
				: [url.pathname.slice(1)];
			const { signal } = new AbortController();
			return createContext({
				req: req as NextApiRequest,
				res: res as NextApiResponse,
				info: {
					accept: "application/jsonl",
					type: "query",
					isBatchCall,
					calls: paths.map((path, idx) => ({
						path,
						getRawInput: async () => inputs[idx] ?? undefined,
						result: () => inputs[idx] ?? undefined,
						procedure: null,
					})),
					connectionParams: null,
					signal,
				},
				...ctx,
			});
		},
	});
	return {
		client: createTRPCClient<R>({
			links: getLinks(
				{},
				{
					url: `http://localhost:${port}`,
					source: "test",
					keepError: !captureError,
					useBatch,
					headers: {
						"x-test-id": ctx.task.id,
						...headers,
					},
					captureError: captureError || (() => "unknown"),
				},
			),
			transformer,
		} as unknown as CreateTRPCClientOptions<R>),
		start: () =>
			new Promise<void>((resolve) => {
				httpServer.listen(port, resolve);
			}),
		destroy: async () => {
			await new Promise<void>((resolve, reject) => {
				httpServer.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
};
