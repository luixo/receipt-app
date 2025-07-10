import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getNow } from "~utils/date";
import { MINUTE, YEAR } from "~utils/time";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("sessions.cleanup", () => {
	describe("functionality", () => {
		test("sessions are removed", async ({ ctx }) => {
			// Verifying other sessions are not affected
			await insertAccountWithSession(ctx);
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, {
				// non-expired session
				expirationTimestamp: new Date(getNow().valueOf() + MINUTE),
			});
			await insertSession(ctx, accountId, {
				// just expired session
				expirationTimestamp: new Date(getNow().valueOf() - MINUTE),
			});
			await insertSession(ctx, accountId, {
				// long expired session
				expirationTimestamp: new Date(getNow().valueOf() - YEAR),
			});
			const caller = createCaller(await createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
