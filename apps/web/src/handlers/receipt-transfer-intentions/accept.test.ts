import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accept";

const router = t.router({ procedure });

describe("receiptTransferIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				receiptId: faker.string.uuid(),
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: "invalid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ receiptId: fakeReceiptId }),
				"NOT_FOUND",
				`Transfer intention for receipt "${fakeReceiptId}" does not exist or you are not its target.`,
			);
		});

		describe("receipt does not have transfer intention", () => {
			test("account is an owner of the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId }),
					"NOT_FOUND",
					`Transfer intention for receipt "${receiptId}" does not exist or you are not its target.`,
				);
			});

			test("account is not an owner of the receipt", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignReceiptId } = await insertReceipt(
					ctx,
					foreignAccountId,
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId: foreignReceiptId }),
					"NOT_FOUND",
					`Transfer intention for receipt "${foreignReceiptId}" does not exist or you are not its target.`,
				);
			});
		});

		test("receipt's transfer intention is not active account", async ({
			ctx,
		}) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: anotherAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
				{ transferIntentionAccountId: anotherAccountId },
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ receiptId: foreignReceiptId }),
				"NOT_FOUND",
				`Transfer intention for receipt "${foreignReceiptId}" does not exist or you are not its target.`,
			);
		});
	});

	describe("functionality", () => {
		test("transfer intention is accepted", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
				{ transferIntentionAccountId: accountId },
			);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);
			await insertReceipt(ctx, foreignAccountId, {
				transferIntentionAccountId: accountId,
			});

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ receiptId: foreignReceiptId }),
			);
			expect(result).toBeUndefined();
		});
	});
});
