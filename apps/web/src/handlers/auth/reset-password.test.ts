import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from "~app/utils/validation";
import { createContext } from "~tests/backend/utils/context";
import {
	assertDatabase,
	insertAccountWithSession,
	insertResetPasswordIntention,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MINUTE } from "~utils/time";
import { t } from "~web/handlers/trpc";
import { getHash } from "~web/utils/crypto";
import { getResHeaders } from "~web/utils/headers";

import { procedure } from "./reset-password";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.resetPassword", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							token: "invalid-uuid",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid UUID`,
				);
			});
		});

		describe("password", () => {
			test("minimal length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							token: faker.string.uuid(),
							password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							token: faker.string.uuid(),
							password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		test("no intention exists", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						token: intentionToken,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention "${intentionToken}" does not exist or expired.`,
			);
		});

		test("intention expires", async ({ ctx }) => {
			const { accountId } = await insertAccountWithSession(ctx);
			const { token } = await insertResetPasswordIntention(ctx, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			const caller = createCaller(await createContext(ctx));
			await expectTRPCError(
				() =>
					caller.procedure({
						token,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention "${token}" does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("password reset", async ({ ctx }) => {
			const { accountId } = await insertAccountWithSession(ctx);
			// Verifying other accounts are not affected
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			// Verifying other intentions are not affected
			await insertResetPasswordIntention(ctx, otherAccountId);
			// Verifying other intentions of the same user are removed
			await insertResetPasswordIntention(ctx, accountId);
			await insertResetPasswordIntention(ctx, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			const { token } = await insertResetPasswordIntention(ctx, accountId);
			const context = await createContext(ctx);
			const caller = createCaller(context);
			const password = faker.internet.password();
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					token,
					password,
				}),
			);
			const database = assertDatabase(ctx);
			const { passwordHash, passwordSalt } = await database
				.selectFrom("accounts")
				.where("id", "=", accountId)
				.select(["passwordHash", "passwordSalt"])
				.executeTakeFirstOrThrow();
			expect(await getHash(password, passwordSalt)).toBe(passwordHash);
			expect(getResHeaders(context)).toHaveLength(0);
		});
	});
});
