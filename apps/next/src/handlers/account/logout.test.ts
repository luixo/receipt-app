import { describe, expect } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./logout";

const router = t.router({ procedure });

describe("account.logout", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("session is removed", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			const caller = router.createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
			expect(ctx.responseHeaders).toMatchSnapshot();
		});
	});
});
