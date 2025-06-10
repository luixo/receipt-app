import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./change-password";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("account.changePassword", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ prevPassword: "", password: "" }),
		);

		const types = ["password", "prevPassword"] as const;
		types.forEach((type) => {
			const otherType = types.find((lookupType) => lookupType !== type);
			describe(type, () => {
				test("minimal length", async ({ ctx }) => {
					const { sessionId } = await insertAccountWithSession(ctx);
					const caller = createCaller(await createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								[type as "password"]: "a".repeat(MIN_PASSWORD_LENGTH - 1),
								[otherType as "prevPassword"]: "a".repeat(MIN_PASSWORD_LENGTH),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${type}": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
					);
				});

				test("maximum length", async ({ ctx }) => {
					const { sessionId } = await insertAccountWithSession(ctx);
					const caller = createCaller(await createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								[type as "password"]: "a".repeat(MAX_PASSWORD_LENGTH + 1),
								[otherType as "prevPassword"]: "a".repeat(MAX_PASSWORD_LENGTH),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${type}": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
					);
				});
			});
		});

		test("previous password doesn't match", async ({ ctx }) => {
			const currentPassword = faker.internet.password();
			const nextPassword = faker.internet.password();
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx, {
				account: { password: currentPassword },
			});
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						password: nextPassword,
						prevPassword: `not_${currentPassword}`,
					}),
				"UNAUTHORIZED",
				`Change password of account "${email}" failed: password doesn't match.`,
			);
		});
	});

	describe("functionality", () => {
		test("password changes", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			const currentPassword = faker.internet.password();
			const nextPassword = faker.internet.password();
			const { sessionId } = await insertAccountWithSession(ctx, {
				account: { password: currentPassword },
			});
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					password: nextPassword,
					prevPassword: currentPassword,
				}),
			);
		});
	});
});
