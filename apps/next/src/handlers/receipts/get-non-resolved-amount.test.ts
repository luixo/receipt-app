import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
} from "@tests/backend/utils/data";
import { expectUnauthorizedError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get-non-resolved-amount";

const router = t.router({ procedure });

describe("receipts.getNonResolvedAmount", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("empty", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, selfUserId, {
				resolved: true,
			});

			const { id: foreignAccountId } = await insertAccount(ctx);
			const [, { id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
				{
					resolved: true,
				},
			);

			// Verify other receipts do not interfere
			await insertReceipt(ctx, accountId);
			await insertReceipt(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toEqual<typeof result>(0);
		});

		test("return both own and foreign receipt resolved marks", async ({
			ctx,
		}) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, selfUserId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const [, { id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);
			const { id: otherForeignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				otherForeignReceiptId,
				foreignToSelfUserId,
				{ role: "editor" },
			);

			// Verify other receipts do not interfere
			await insertReceipt(ctx, accountId);
			await insertReceipt(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toEqual<typeof result>(3);
		});
	});
});
