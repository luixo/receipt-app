import type { AnyTRPCRouter } from "@trpc/server";
import { incomingMessageToRequest } from "@trpc/server/adapters/node-http";
import {
	getRequestInfo,
	toURL,
} from "@trpc/server/unstable-core-do-not-import";
import type { MockRequestOptions, MockResponseOptions } from "mock-http";
import { Request as MockRequest, Response as MockResponse } from "mock-http";

import type { SessionsSessionId } from "~db/models";
import type { TestContext } from "~tests/backend/utils/test";
import { createContext as createContextRaw } from "~web/handlers/context";
import type { UnauthorizedContext } from "~web/handlers/context";
import { t } from "~web/handlers/trpc";

type ContextOptions = {
	request?: MockRequestOptions;
	response?: MockResponseOptions;
	router?: AnyTRPCRouter;
};

export const createContext = (
	ctx: TestContext,
	options?: ContextOptions,
): UnauthorizedContext => {
	const mockReq = new MockRequest(options?.request);
	const mockRes = new MockResponse(options?.response);
	const request = incomingMessageToRequest(mockReq, { maxBodySize: null });
	const url = toURL(`http://${request.headers.get("host")}${request.url}`);
	return createContextRaw(
		{
			info: getRequestInfo({
				req: request,
				path: url.pathname.slice(1),
				router: options?.router ?? t.router({}),
				searchParams: url.searchParams,
				headers: request.headers,
			}),
			req: mockReq,
			res: mockRes,
		},
		ctx,
	);
};

export const createAuthContext = (
	ctx: TestContext,
	sessionId: SessionsSessionId,
	{ request, ...options }: ContextOptions = {},
) =>
	createContext(ctx, {
		request: {
			...request,
			headers: {
				"x-test-id": ctx.task.id,
				...request?.headers,
				cookie: [
					`authToken=${sessionId}`,
					...((
						request?.headers as Record<string, string> | undefined
					)?.cookie?.split(";") || []),
				].join(";"),
			},
		},
		...options,
	});
