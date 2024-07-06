import type { CreateTRPCClientOptions } from "@trpc/client";
import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { nodeHTTPFormDataContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/form-data";
import { nodeHTTPJSONContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/json";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { NextApiRequest, NextApiResponse } from "next";

import type { GetLinksOptions, Headers } from "~app/utils/trpc";
import { getLinks, transformer } from "~app/utils/trpc";
import type { TestContext } from "~tests/backend/utils/test";
import { createContext } from "~web/handlers/context";

export const getClientServer = async <R extends AnyRouter>(
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
	const port = (await findFreePorts())[0]!;
	const httpServer = createHTTPServer({
		router,
		createContext: ({ req, res }) => {
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			const isBatchCall = Boolean(url.searchParams.get("batch"));
			const inputs = (JSON.parse(url.searchParams.get("input")!) ||
				{}) as Record<number, unknown>;
			const paths = isBatchCall
				? decodeURIComponent(url.pathname.slice(1)).split(",")
				: [url.pathname.slice(1)];
			return createContext({
				req: req as NextApiRequest,
				res: res as NextApiResponse,
				info: {
					isBatchCall,
					calls: paths.map((path, idx) => ({
						path,
						type: "query",
						input: inputs[idx] ?? undefined,
					})),
				},
				...ctx,
			});
		},
		experimental_contentTypeHandlers: [
			nodeHTTPFormDataContentTypeHandler(),
			nodeHTTPJSONContentTypeHandler(),
		],
	});
	return {
		client: createTRPCClient<R>({
			links: getLinks(`http://localhost:${port}`, {
				searchParams: {},
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
