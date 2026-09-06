import { assert } from "vitest";

import type { SessionId } from "~db/ids";
import type { TestContext } from "~tests/backend/utils/test";

type ContextOptions = {
	reqHeaders?: Headers | Record<string, string>;
	resHeaders?: Headers;
};

export const createContext = (
	ctx: TestContext,
	{
		reqHeaders = new Headers(),
		resHeaders = new Headers(),
	}: ContextOptions = {},
) => {
	const { database, ...rest } = ctx;
	assert(database, "tRPC context require database to exist");
	return {
		...rest,
		database: database.instance,
		reqHeaders: new Headers(reqHeaders),
		resHeaders,
	};
};

export const createAuthContext = (
	ctx: TestContext,
	sessionId: SessionId,
	{ reqHeaders, ...options }: ContextOptions = {},
) => {
	const headers = new Headers(reqHeaders);
	headers.set("x-test-id", ctx.task.id);
	headers.append("Cookie", `authToken=${sessionId}`);
	return createContext(ctx, {
		reqHeaders: headers,
		...options,
	});
};
