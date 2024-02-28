import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MINUTE, YEAR } from "~utils";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const router = t.router({ procedure });

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
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
