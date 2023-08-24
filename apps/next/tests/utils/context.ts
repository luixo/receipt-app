import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingHttpHeaders } from "node:http";

import type { SessionsSessionId } from "next-app/db/models";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { createContext as createContextRaw } from "next-app/handlers/context";

type ContextOptions = {
	headers?: IncomingHttpHeaders;
};

type HeaderValue = number | string | ReadonlyArray<string>;
export type HeaderPair = { name: string; value: HeaderValue };
type ControllerExtension = { setHeaders: HeaderPair[] };

export const createContext = (
	options: ContextOptions = {},
): UnauthorizedContext & ControllerExtension => {
	const setHeaders: HeaderPair[] = [];
	// A poor emulation of real req / res, add props as needed
	const context = createContextRaw({
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
	sessionId: SessionsSessionId = "mock-session-id",
	{ headers, ...options }: ContextOptions = {},
) =>
	createContext({
		headers: {
			cookie: `authToken=${sessionId}`,
			...headers,
		},
		...options,
	});
