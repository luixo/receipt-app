import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertItemParticipant,
	insertReceipt,
	insertReceiptItem,
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

import { procedure } from "./remove";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("itemParticipants.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				itemId: faker.string.uuid(),
				userId: faker.string.uuid(),
			}),
		);

		describe("itemId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: "not-a-uuid",
							userId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "itemId": Invalid uuid`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: "not-a-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid uuid`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeItemId,
						userId: faker.string.uuid(),
					}),
				"NOT_FOUND",
				`Receipt item "${fakeItemId}" does not exist.`,
			);
		});

		test("not enough rights to remove an item participant", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
				{ role: "viewer" },
			);
			const { id: receiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);
			await insertItemParticipant(ctx, receiptItemId, foreignToSelfUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userId: foreignToSelfUserId,
					}),
				"FORBIDDEN",
				`Not enough rights to remove item from receipt "${foreignReceiptId}".`,
			);
		});

		test("item part does not exist", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: userId } = await insertUser(ctx, accountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, userId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertItemParticipant(ctx, receiptItemId, selfUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ itemId: receiptItemId, userId }),
				"NOT_FOUND",
				`Item participant "${userId}" on item "${receiptItemId}" on receipt "${receiptId}" doesn't exist.`,
			);
		});
	});

	describe("functionality", () => {
		test("part is removed", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: userId } = await insertUser(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, userId, {
				resolved: true,
				role: "editor",
			});
			await insertReceiptParticipant(ctx, receiptId, anotherUserId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertItemParticipant(ctx, receiptItemId, userId);
			await insertItemParticipant(ctx, receiptItemId, anotherUserId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			const { id: anotheritemId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, anotheritemId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ itemId: receiptItemId, userId }),
			);
		});
	});
});
