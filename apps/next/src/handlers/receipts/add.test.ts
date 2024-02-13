import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";
import { UUID_REGEX } from "next-app/handlers/validation";

import { procedure } from "./add";
import {
	getValidReceipt,
	verifyCurrencyCode,
	verifyIssued,
	verifyName,
} from "./utils.test";

const router = t.router({ procedure });

describe("receipts.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(getValidReceipt()),
		);

		verifyName(
			(context, name) =>
				router.createCaller(context).procedure({ ...getValidReceipt(), name }),
			"",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				router
					.createCaller(context)
					.procedure({ ...getValidReceipt(), currencyCode }),
			"",
		);

		verifyIssued(
			(context, issued) =>
				router
					.createCaller(context)
					.procedure({ ...getValidReceipt(), issued }),
			"",
		);

		describe("participants", () => {
			test("invalid uuid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const invalidUuid = "not-a-uuid";
				await expectTRPCError(
					() =>
						caller.procedure({
							...getValidReceipt(),
							participants: [faker.string.uuid(), invalidUuid],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "participants[1]": Invalid uuid`,
				);
			});
		});

		test("user does not exist", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await insertUser(ctx, accountId);
			const fakeUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [fakeUserId],
					}),
				"NOT_FOUND",
				`User "${fakeUserId}" does not exist or is not owned by "${email}".`,
			);
		});

		test("user is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [foreignUserId],
					}),
				"NOT_FOUND",
				`User "${foreignUserId}" does not exist or is not owned by "${account.email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("receipt is added", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidReceipt()),
			);
			expect(result).toMatch(UUID_REGEX);
		});

		test("receipt is added - with users", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidReceipt(),
					participants: [userId, selfUserId],
				}),
			);
			expect(result).toMatch(UUID_REGEX);
		});
	});
});
