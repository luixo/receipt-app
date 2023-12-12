import type { CreateTRPCClientOptions } from "@trpc/client";
import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { nodeHTTPFormDataContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/form-data";
import { nodeHTTPJSONContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/json";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import type { NextApiRequest, NextApiResponse } from "next";

import type { TestContext } from "@tests/backend/utils/test";
import type { LinkHeaders } from "app/utils/trpc";
import { getLinks, transformer } from "app/utils/trpc";
import { createContext } from "next-app/handlers/context";

export const getClientServer = async <R extends AnyRouter>(
	ctx: TestContext,
	router: R,
	headers?: LinkHeaders,
) => {
	const port = (await findFreePorts())[0]!;
	const httpServer = createHTTPServer({
		router,
		createContext: ({ req, res }) =>
			createContext({
				req: req as NextApiRequest,
				res: res as NextApiResponse,
				info: { isBatchCall: false, calls: [] },
				...ctx,
			}),
		experimental_contentTypeHandlers: [
			nodeHTTPFormDataContentTypeHandler(),
			nodeHTTPJSONContentTypeHandler(),
		],
	});
	return {
		client: createTRPCClient<R>({
			links: getLinks(`http://localhost:${port}`, { headers, keepError: true }),
			transformer,
		} as unknown as CreateTRPCClientOptions<R>),
		start: () =>
			new Promise<void>((resolve) => {
				httpServer.listen(port, "localhost", resolve);
			}),
		destroy: async () => {
			await new Promise<void>((resolve, reject) => {
				httpServer.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
};
