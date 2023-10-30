import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./remove";
import { verifyReceiptItemId } from "./test.utils";

const router = t.router({ procedure });

describe("receiptItems.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		verifyReceiptItemId(
			(context, receiptItemId) =>
				router.createCaller(context).procedure({ id: receiptItemId }),
			"",
		);

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeReceiptItemId }),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" is not found.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptItemId }),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}".`,
			);
		});

		test("receipt role is lower than editor", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
				{ role: "viewer" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptItemId }),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}" with role "viewer"`,
			);
		});

		test("receipt is locked", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				lockedTimestamp: new Date(),
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: receiptItemId }),
				"FORBIDDEN",
				`Receipt "${receiptId}" cannot be updated while locked.`,
			);
		});
	});

	describe("functionality", () => {
		test("own receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptItemId }),
			);
		});

		test("foreign receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
			await insertReceiptParticipant(ctx, receiptId, foreignToSelfUserId, {
				role: "editor",
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, anotherReceiptId);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptItem(ctx, foreignReceiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptItemId }),
			);
		});
	});
});
