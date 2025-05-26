import { faker } from "@faker-js/faker";
import type { CreateTRPCClientOptions } from "@trpc/client";
import { createTRPCClient } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import { fromEntries } from "remeda";
import { assert } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import type { GetLinksOptions, Headers } from "~app/utils/trpc";
import { getLinks, transformer } from "~app/utils/trpc";
import type { TestContext } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import type { NetContext } from "~web/handlers/context";
import { createContext } from "~web/handlers/context";
import {
	createRequestHeaders,
	createResponseHeaders,
} from "~web/utils/headers";

export const getRandomCurrencyCode = (): CurrencyCode =>
	faker.helpers.arrayElement(CURRENCY_CODES);

type HttpServerOptions = Parameters<
	NonNullable<Parameters<typeof createHTTPServer>[0]["createContext"]>
>[0];
const getUrl = (req: HttpServerOptions["req"]) =>
	new URL(
		req.url || "",
		`${"encrypted" in req.socket ? "https" : "http"}://${req.headers.host}`,
	);
const createReq = ({ req }: HttpServerOptions): NetContext["req"] => {
	const url = getUrl(req);
	const pathUrl = new URL(url);
	pathUrl.search = "";
	pathUrl.hash = "";
	return {
		url: pathUrl.toString(),
		query: fromEntries([...url.searchParams.entries()]),
		headers: createRequestHeaders(req.headers),
		socketId: `${req.socket.remoteAddress}:${req.socket.localPort}`,
	};
};
const createInfo = ({ req }: HttpServerOptions): NetContext["info"] => {
	const url = getUrl(req);
	const isBatchCall = Boolean(url.searchParams.get("batch"));
	const input = url.searchParams.get("input");
	assert(input, "expected to have input in searchParam");
	const inputs = (JSON.parse(input) || {}) as Record<number, unknown>;
	const paths = isBatchCall
		? decodeURIComponent(url.pathname.slice(1)).split(",")
		: [url.pathname.slice(1)];
	const { signal } = new AbortController();
	return {
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
	};
};
const createNetContext = (opts: HttpServerOptions): NetContext => ({
	info: createInfo(opts),
	req: createReq(opts),
	res: { headers: createResponseHeaders() },
});

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
		createContext: (opts) => createContext(createNetContext(opts), ctx),
	});
	return {
		client: createTRPCClient<R>({
			links: getLinks({
				searchParams: { debug: null, proxyPort: null, controllerId: null },
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
