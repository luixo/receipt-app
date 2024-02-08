import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get-resolved-participants";

const router = t.router({ procedure });

describe("receipts.getResolvedParticipants", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router
				.createCaller(context)
				.procedure({ receiptId: faker.string.uuid() }),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
				);
			});
		});

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ receiptId: fakeReceiptId }),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" is not found.`,
			);
		});

		test("account has no role in the receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ receiptId: foreignReceiptId }),
				"FORBIDDEN",
				`Account "${email}" has no access to receipt "${foreignReceiptId}"`,
			);
		});
	});

	describe("functionality", () => {
		test("empty", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("own receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			// some users are resolved
			await insertReceiptParticipant(ctx, receiptId, selfUserId, {
				resolved: true,
			});
			const [{ id: userId }] = await insertConnectedUsers(ctx, [
				accountId,
				otherAccountId,
			]);
			await insertReceiptParticipant(ctx, receiptId, userId);

			// Verify other receipts do not interfere
			const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, otherReceiptId, userId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(ctx, foreignReceiptId, userId);
			// Verify not connected users do not show up in resolved participants response
			const { id: notConnectedUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, notConnectedUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>(
				[
					{ remoteUserId: userId, resolved: false, localUserId: userId },
					{ remoteUserId: selfUserId, resolved: true, localUserId: selfUserId },
				].sort((a, b) => a.remoteUserId.localeCompare(b.remoteUserId)),
			);
		});

		test("their receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: connectedAccountId } = await insertAccount(ctx);
			const { id: notConnectedAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);

			// user that has a corresponding user in my account
			const [{ id: foreignToConnectedUserId }] = await insertConnectedUsers(
				ctx,
				[foreignAccountId, connectedAccountId],
			);
			const [{ id: connectedUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				connectedAccountId,
			]);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToConnectedUserId,
				{ resolved: true },
			);
			// user that has no corresponding user in my account
			const [{ id: foreignToNotConnectedUserId }] = await insertConnectedUsers(
				ctx,
				[foreignAccountId, notConnectedAccountId],
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToNotConnectedUserId,
			);
			// user that is me
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);

			// Verify not connected users do not show up in resolved participants response
			const { id: notConnectedForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				notConnectedForeignUserId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId: foreignReceiptId });
			expect(result).toStrictEqual<typeof result>(
				[
					{
						remoteUserId: foreignToConnectedUserId,
						resolved: true,
						localUserId: connectedUserId,
					},
					{
						remoteUserId: foreignToNotConnectedUserId,
						resolved: false,
						localUserId: null,
					},
					{
						remoteUserId: foreignToSelfUserId,
						resolved: false,
						localUserId: selfUserId,
					},
				].sort((a, b) => a.remoteUserId.localeCompare(b.remoteUserId)),
			);
		});
	});
});
