import type { SessionsSessionId } from "~db/models";
import type { TestContext } from "~tests/backend/utils/test";
import { createContext as createContextRaw } from "~web/handlers/context";
import type { NetContext, UnauthorizedContext } from "~web/handlers/context";
import {
	createRequestHeaders,
	createResponseHeaders,
} from "~web/utils/headers";

type ContextOptions = {
	headers?: Record<string, string>;
};

const createNetContext = (opts?: ContextOptions): NetContext => ({
	req: {
		url: "unknown",
		query: {},
		headers: createRequestHeaders(opts?.headers),
		socketId: "testSocketId",
	},
	res: {
		headers: createResponseHeaders(),
	},
	info: {
		accept: "application/jsonl",
		type: "query",
		isBatchCall: false,
		calls: [],
		connectionParams: null,
		signal: new AbortController().signal,
	},
});

export const createContext = (
	ctx: TestContext,
	options?: ContextOptions,
): UnauthorizedContext => createContextRaw(createNetContext(options), ctx);

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
