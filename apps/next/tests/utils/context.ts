import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingHttpHeaders } from "node:http";

import type { SessionsSessionId } from "next-app/db/models";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { createContext as createContextRaw } from "next-app/handlers/context";
import type { TestContext } from "next-tests/utils/test";

type ContextOptions = {
	headers?: IncomingHttpHeaders;
};

type HeaderValue = number | string | ReadonlyArray<string>;
export type HeaderPair = { name: string; value: HeaderValue };
type ControllerExtension = { setHeaders: HeaderPair[] };

export const createContext = (
	ctx: TestContext,
	options: ContextOptions = {},
): UnauthorizedContext & ControllerExtension => {
	const setHeaders: HeaderPair[] = [];
	// A poor emulation of real req / res, add props as needed
	const context = createContextRaw({
		...ctx,
		req: {
			headers: options.headers || {},
		} as unknown as NextApiRequest,
		res: {
			getHeader: () => "",
			setHeader: (name: string, value: HeaderValue) => {
				setHeaders.push({ name, value });
			},
		} as unknown as NextApiResponse,
	});
	return { ...context, setHeaders };
};

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
