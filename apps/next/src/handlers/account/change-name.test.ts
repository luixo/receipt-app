import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from "app/utils/validation";
import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("account.changeName", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) =>
			caller.account.changeName({ name: "" }),
		);

		describe("user name", () => {
			test("minimal length", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx.database);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.account.changeName({
							name: "a".repeat(MIN_USERNAME_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Minimal length for user name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx.database);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.account.changeName({
							name: "a".repeat(MAX_USERNAME_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Maximum length for user name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("name changes", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertAccountWithSession(ctx.database);
			const { sessionId } = await insertAccountWithSession(ctx.database);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.account.changeName({ name: faker.person.firstName() }),
			);
		});
	});
});
