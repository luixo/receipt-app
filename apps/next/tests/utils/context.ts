import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingHttpHeaders } from "node:http";

import type { SessionsSessionId } from "next-app/db/models";
import { createContext as createContextRaw } from "next-app/handlers/context";

type ContextOptions = {
	headers?: IncomingHttpHeaders;
};

export const createContext = (options: ContextOptions = {}) =>
	// A poor emulation of real req / res, add props as needed
	createContextRaw({
		req: {
			headers: options.headers || {},
		} as unknown as NextApiRequest,
		res: {
			getHeader: () => "",
			setHeader: () => "",
		} as unknown as NextApiResponse,
	});

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
