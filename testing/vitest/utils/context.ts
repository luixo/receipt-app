import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingHttpHeaders } from "node:http";

import type { SessionsSessionId } from "~db/models";
import type { TestContext } from "~tests/backend/utils/test";
import type { UnauthorizedContext } from "~web/handlers/context";
import { createContext as createContextRaw } from "~web/handlers/context";

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
			setHeader: ctx.responseHeaders.add,
		} as unknown as NextApiResponse,
		info: {
			accept: "application/jsonl",
			type: "query",
			isBatchCall: false,
			calls: [],
			connectionParams: null,
			signal: new AbortController().signal,
		},
	});

export const createAuthContext = (
	ctx: TestContext,
	sessionId: SessionsSessionId,
	{ headers, ...options }: ContextOptions = {},
) =>
	createContext(ctx, {
		headers: {
			"x-test-id": ctx.task.id,
			...headers,
			cookie: [
				`authToken=${sessionId}`,
				...(headers?.cookie?.split(";") || []),
			].join(";"),
		},
		...options,
	});
