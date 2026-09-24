import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertSession,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("sessions.cleanup", () => {
	describe("functionality", () => {
		test("sessions are removed", async ({ ctx }) => {
			// Verifying other sessions are not affected
			await insertUserWithSession(ctx);
			const now = Temporal.Now.zonedDateTimeISO();
			const { id: userId } = await insertUser(ctx);
			await insertSession(ctx, userId, {
				// non-expired session
				expirationTimestamp: now.add({ minutes: 1 }),
			});
			await insertSession(ctx, userId, {
				// just expired session
				expirationTimestamp: now.subtract({ minutes: 1 }),
			});
			await insertSession(ctx, userId, {
				// long expired session
				expirationTimestamp: now.subtract({ years: 1 }),
			});
			const caller = createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
