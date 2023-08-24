import { faker } from "@faker-js/faker";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "app/utils/validation";
import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";

describe("account.changePassword", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) =>
			caller.account.changePassword({ prevPassword: "", password: "" }),
		);

		const types = ["password", "prevPassword"] as const;
		types.forEach((type) => {
			const otherType = types.filter((lookupType) => lookupType !== type)[0]!;
			describe(type, () => {
				test("minimal length", async () => {
					const { database } = global.testContext!;
					const { sessionId } = await insertAccountWithSession(database);
					const caller = router.createCaller(createAuthContext(sessionId));
					await expectTRPCError(
						() =>
							caller.account.changePassword({
								[type as "password"]: "a".repeat(MIN_PASSWORD_LENGTH - 1),
								[otherType as "prevPassword"]: "a".repeat(MIN_PASSWORD_LENGTH),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${type}": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
					);
				});

				test("maximum length", async () => {
					const { database } = global.testContext!;
					const { sessionId } = await insertAccountWithSession(database);
					const caller = router.createCaller(createAuthContext(sessionId));
					await expectTRPCError(
						() =>
							caller.account.changePassword({
								[type as "password"]: "a".repeat(MAX_PASSWORD_LENGTH + 1),
								[otherType as "prevPassword"]: "a".repeat(MAX_PASSWORD_LENGTH),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${type}": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
					);
				});
			});
		});

		test("previous password doesn't match", async () => {
			const { database } = global.testContext!;
			const currentPassword = faker.internet.password();
			const nextPassword = faker.internet.password();
			const { sessionId, accountId } = await insertAccountWithSession(
				database,
				{ account: { password: currentPassword } },
			);
			const caller = router.createCaller(createAuthContext(sessionId));
			await expectTRPCError(
				() =>
					caller.account.changePassword({
						password: nextPassword,
						prevPassword: `not_${currentPassword}`,
					}),
				"UNAUTHORIZED",
				`Change password of account "${accountId}" failed: password doesn't match.`,
			);
		});
	});

	describe("functionality", () => {
		test("password changes", async () => {
			const { database } = global.testContext!;
			// Verifying other accounts are not affected
			await insertAccountWithSession(database);
			const currentPassword = faker.internet.password();
			const nextPassword = faker.internet.password();
			const { sessionId } = await insertAccountWithSession(database, {
				account: { password: currentPassword },
			});
			const caller = router.createCaller(createAuthContext(sessionId));

			await expectDatabaseDiffSnapshot(() =>
				caller.account.changePassword({
					password: nextPassword,
					prevPassword: currentPassword,
				}),
			);
		});
	});
});
