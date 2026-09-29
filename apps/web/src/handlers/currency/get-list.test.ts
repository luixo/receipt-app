import { describe, expect } from "vitest";

import { createAuthContext } from "#tests/backend/utils/context.ts";
import { insertUserWithSession } from "#tests/backend/utils/data.ts";
import { expectUnauthorizedError } from "#tests/backend/utils/expect.ts";
import { test } from "#tests/backend/utils/test.ts";
import { t } from "#web/handlers/trpc.ts";

import { procedure } from "./get-list";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("currency.getList", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test(`list returned`, async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toMatchSnapshot();
		});
	});
});
