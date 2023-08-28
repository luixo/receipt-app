import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingHttpHeaders } from "node:http";

import type { SessionsSessionId } from "next-app/db/models";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { createContext as createContextRaw } from "next-app/handlers/context";
import type { TestContext } from "next-tests/utils/test";

type ContextOptions = {
	headers?: IncomingHttpHeaders;
};

export const createContext = (
	ctx: TestContext,
	options: ContextOptions = {},
): UnauthorizedContext =>
	// A poor emulation of real req / res, add props as needed
	createContextRaw({
		...ctx,
		req: {
			headers: options.headers || {},
		} as unknown as NextApiRequest,
		res: {
			getHeader: () => "",
			setHeader: (...args: (typeof ctx)["responseHeaders"][0]) => {
				ctx.responseHeaders.push(args);
			},
		} as unknown as NextApiResponse,
	});

export const createAuthContext = (
	ctx: TestContext,
	sessionId: SessionsSessionId,
	{ headers, ...options }: ContextOptions = {},
) =>
	createContext(ctx, {
		headers: {
			cookie: `authToken=${sessionId}`,
			...headers,
		},
		...options,
	});
