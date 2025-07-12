import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { add, getNow, subtract } from "~utils/date";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("sessions.cleanup", () => {
	describe("functionality", () => {
		test("sessions are removed", async ({ ctx }) => {
			// Verifying other sessions are not affected
			await insertAccountWithSession(ctx);
			const now = getNow.zonedDateTime();
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, {
				// non-expired session
				expirationTimestamp: add.zonedDateTime(now, { minutes: 1 }),
			});
			await insertSession(ctx, accountId, {
				// just expired session
				expirationTimestamp: subtract.zonedDateTime(now, { minutes: 1 }),
			});
			await insertSession(ctx, accountId, {
				// long expired session
				expirationTimestamp: subtract.zonedDateTime(now, { years: 1 }),
			});
			const caller = createCaller(await createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
