import type { AnyTRPCRouter } from "@trpc/server";
import {
	createURL,
	incomingMessageToRequest,
} from "@trpc/server/adapters/node-http";
import { getRequestInfo } from "@trpc/server/unstable-core-do-not-import";
import type {
	MockRequest,
	MockResponse,
	RequestOptions,
	ResponseOptions,
} from "node-mocks-http";
import { createRequest, createResponse } from "node-mocks-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { assert } from "vitest";

import type { SessionId } from "~db/ids";
import type { TestContext } from "~tests/backend/utils/test";
import { createContext as createContextRaw } from "~web/handlers/context";
import type { UnauthorizedContext } from "~web/handlers/context";
import { t } from "~web/handlers/trpc";

type ContextOptions = {
	request?: RequestOptions;
	response?: ResponseOptions;
	router?: AnyTRPCRouter;
};

export const createContext = async (
	ctx: TestContext,
	options?: ContextOptions,
): Promise<UnauthorizedContext> => {
	const mockReq = createRequest(
		options?.request,
	) as MockRequest<IncomingMessage>;
	const mockRes = createResponse(
		options?.response,
	) as MockResponse<ServerResponse>;
	const request = incomingMessageToRequest(mockReq, mockRes, {
		maxBodySize: null,
	});
	const url = createURL(mockReq);
	const { database, ...rest } = ctx;
	assert(database, "tRPC context require database to exist");
	return createContextRaw(
		{
			info: await getRequestInfo({
				req: request,
				url,
				path: url.pathname.slice(1),
				router: options?.router ?? t.router({}),
				searchParams: url.searchParams,
				headers: request.headers,
			}),
			req: mockReq,
			res: mockRes,
		},
		{ ...rest, database: database.instance },
	);
};

export const createAuthContext = (
	ctx: TestContext,
	sessionId: SessionId,
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
