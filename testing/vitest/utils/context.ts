import { assert } from "vitest";

import type { TestContext } from "~tests/backend/utils/test";
import { getAuthDatabase } from "~web/auth/database";

export const TEST_AUTH_SECRET =
	"receipt-app-test-secret-012345678901234567890123456789";

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
		authDatabase: getAuthDatabase(database.connectionString),
		authSecret: TEST_AUTH_SECRET,
		reqHeaders: new Headers(reqHeaders),
		resHeaders,
	};
};

export const createAuthContext = (
	ctx: TestContext,
	sessionCookie: string,
	{ reqHeaders, ...options }: ContextOptions = {},
) => {
	const headers = new Headers(reqHeaders);
	headers.set("x-test-id", ctx.task.id);
	headers.append("Cookie", `better-auth.session_token=${sessionCookie}`);
	return createContext(ctx, {
		reqHeaders: headers,
		...options,
	});
};
