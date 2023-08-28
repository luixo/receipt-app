import { describe, expect } from "vitest";

import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("account.logout", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) => caller.account.logout());
	});

	describe("functionality", () => {
		test("session is removed", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			const caller = router.createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.account.logout());
			expect(ctx.responseHeaders).toMatchSnapshot();
		});
	});
});
