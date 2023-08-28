import { describe } from "vitest";

import { MINUTE, YEAR } from "app/utils/time";
import { router } from "next-app/handlers/index";
import { createContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "next-tests/utils/data";
import { expectDatabaseDiffSnapshot } from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("sessions.cleanup", () => {
	describe("functionality", () => {
		test("sessions are removed", async ({ ctx }) => {
			// Verifying other sessions are not affected
			await insertAccountWithSession(ctx);
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, {
				// non-expired session
				expirationTimestamp: new Date(Date.now() + MINUTE),
			});
			await insertSession(ctx, accountId, {
				// just expired session
				expirationTimestamp: new Date(Date.now() - MINUTE),
			});
			await insertSession(ctx, accountId, {
				// long expired session
				expirationTimestamp: new Date(Date.now() - YEAR),
			});
			const caller = router.createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.sessions.cleanup());
		});
	});
});
