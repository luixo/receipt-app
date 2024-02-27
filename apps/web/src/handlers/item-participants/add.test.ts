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

import { procedure } from "./add";

const router = t.router({ procedure });

describe("itemParticipants.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				itemId: faker.string.uuid(),
				userIds: [faker.string.uuid()],
			}),
		);

		describe("itemId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: "not-a-uuid",
							userIds: [faker.string.uuid()],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "itemId": Invalid uuid`,
				);
			});
		});

		describe("userIds", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userIds: ["not-a-uuid", faker.string.uuid()],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userIds[0]": Invalid uuid`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeReceiptItemId,
						userIds: [faker.string.uuid()],
					}),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" does not exist.`,
			);
		});

		test("not enough rights to add an item participant", async ({ ctx }) => {
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userIds: [foreignToSelfUserId],
					}),
				"FORBIDDEN",
				`Not enough rights to add item to receipt "${foreignReceiptId}".`,
			);
		});

		describe("one of the users", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const fakeUserId = faker.string.uuid();
				const anotherFakeUserId = faker.string.uuid();

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userIds: [fakeUserId],
						}),
					"PRECONDITION_FAILED",
					`User "${fakeUserId}" doesn't participate in receipt "${receiptId}".`,
				);
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userIds: [fakeUserId, anotherFakeUserId],
						}),
					"PRECONDITION_FAILED",
					`Users "${fakeUserId}", "${anotherFakeUserId}" don't participate in receipt "${receiptId}".`,
				);
			});

			test("does not participate in the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const { id: userId } = await insertUser(ctx, accountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userIds: [userId],
						}),
					"PRECONDITION_FAILED",
					`User "${userId}" doesn't participate in receipt "${receiptId}".`,
				);
			});

			test("is already added to the item", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

				const { id: participantUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, participantUserId);
				await insertItemParticipant(ctx, receiptItemId, participantUserId);
				const { id: anotherParticipantUserId } = await insertUser(
					ctx,
					accountId,
				);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					anotherParticipantUserId,
				);
				await insertItemParticipant(
					ctx,
					receiptItemId,
					anotherParticipantUserId,
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userIds: [participantUserId],
						}),
					"CONFLICT",
					`User "${participantUserId}" already has a part in item "${receiptItemId}".`,
				);
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userIds: [participantUserId, anotherParticipantUserId],
						}),
					"CONFLICT",
					`Users "${participantUserId}", "${anotherParticipantUserId}" already have a part in item "${receiptItemId}".`,
				);
			});
		});

		test("receipt is locked", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: participantUserId } = await insertUser(ctx, accountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				lockedTimestamp: new Date(),
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertReceiptParticipant(ctx, receiptId, participantUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userIds: [participantUserId],
					}),
				"FORBIDDEN",
				`Receipt "${receiptId}" cannot be updated while locked.`,
			);
		});
	});

	describe("functionality", () => {
		test("item participants are added", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			const user = await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [foreignUser, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			await insertReceiptParticipant(ctx, receiptId, selfUserId);
			await insertReceiptParticipant(ctx, receiptId, user.id);
			await insertReceiptParticipant(ctx, receiptId, foreignUser.id);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);
			await insertReceiptItem(ctx, foreignReceiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					itemId: receiptItemId,
					userIds: [selfUserId, user.id, foreignUser.id],
				}),
			);
		});
	});
});
