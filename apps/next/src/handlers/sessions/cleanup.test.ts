import { MINUTE, YEAR } from "app/utils/time";
import { router } from "next-app/handlers/index";
import { createContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "next-tests/utils/data";
import { expectDatabaseDiffSnapshot } from "next-tests/utils/expect";

describe("sessions.cleanup", () => {
	describe("functionality", () => {
		test("sessions are removed", async () => {
			const { database } = global.testContext!;
			// Verifying other sessions are not affected
			await insertAccountWithSession(database);
			const { id: accountId } = await insertAccount(database);
			await insertSession(database, accountId, {
				// non-expired session
				expirationTimestamp: new Date(Date.now() + MINUTE),
			});
			await insertSession(database, accountId, {
				// just expired session
				expirationTimestamp: new Date(Date.now() - MINUTE),
			});
			await insertSession(database, accountId, {
				// long expired session
				expirationTimestamp: new Date(Date.now() - YEAR),
			});
			const caller = router.createCaller(createContext());
			await expectDatabaseDiffSnapshot(() => caller.sessions.cleanup());
		});
	});
});
