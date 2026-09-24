import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./remove";
import { verifyReceiptItemId } from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItems.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		verifyReceiptItemId(
			(context, receiptItemId) =>
				createCaller(context).procedure({ id: receiptItemId }),
			"",
		);

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeReceiptItemId }),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" is not found.`,
			);
		});

		test("receipt is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptItemId }),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}".`,
			);
		});

		test("receipt role is lower than editor", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeerId,
				{ role: "viewer" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptItemId }),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}" with role "viewer"`,
			);
		});

		test("payer receipt item", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: receiptId }),
				"FORBIDDEN",
				`Payers receipt item cannot be removed.`,
			);
		});
	});

	describe("functionality", () => {
		test("own receipt", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptItemId }),
			);
		});

		test("foreign receipt", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(ctx, receiptId, foreignToSelfPeerId, {
				role: "editor",
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, anotherReceiptId);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptItem(ctx, foreignReceiptId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptItemId }),
			);
		});
	});
});
