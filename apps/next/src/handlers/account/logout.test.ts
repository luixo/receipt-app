import * as timekeeper from "timekeeper";

import { router } from "next-app/handlers/index";
import type { HeaderPair } from "next-tests/utils/context";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "next-tests/utils/expect";

describe("account.logout", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) => caller.account.logout());
	});

	describe("functionality", () => {
		test("session is removed", async () => {
			const { database } = global.testContext!;
			// Verifying other accounts are not affected
			await insertAccountWithSession(database);
			const { sessionId } = await timekeeper.withFreeze(
				new Date("2030-01-01").valueOf(),
				() => insertAccountWithSession(database),
			);
			const context = createAuthContext(sessionId);
			const caller = router.createCaller(context);
			await timekeeper.withFreeze(
				new Date("2020-01-01").valueOf(),
				async () => {
					await expectDatabaseDiffSnapshot(() => caller.account.logout());
					expect(context.setHeaders).toEqual<HeaderPair[]>([
						{
							name: "set-cookie",
							value:
								"authToken=; Path=/; Expires=Wed, 01 Jan 2020 00:00:00 GMT; HttpOnly",
						},
					]);
				},
			);
		});
	});
});
