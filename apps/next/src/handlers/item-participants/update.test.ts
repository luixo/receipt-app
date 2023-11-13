import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertItemParticipant,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./update";

const router = t.router({ procedure });

describe("itemParticipants.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				itemId: faker.string.uuid(),
				userId: faker.string.uuid(),
				update: { type: "part", part: 1 },
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
							userId: faker.string.uuid(),
							update: { type: "part", part: 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "itemId": Invalid uuid`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: "not-a-uuid",
							update: { type: "part", part: 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid uuid`,
				);
			});
		});

		describe("part", () => {
			test("negative", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							update: { type: "part", part: -1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be greater than 0`,
				);
			});

			test("zero", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							update: { type: "part", part: 0 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be non-zero`,
				);
			});

			test("fraction precision", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							update: { type: "part", part: 1.000001 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should have at maximum 5 decimals`,
				);
			});

			test("too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							update: { type: "part", part: 10 ** 9 + 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be less than 1 million`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeItemId,
						userId: faker.string.uuid(),
						update: { type: "part", part: 1 },
					}),
				"NOT_FOUND",
				`Receipt item "${fakeItemId}" does not exist.`,
			);
		});

		test("not enough rights to modify an item participant", async ({ ctx }) => {
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userId: foreignToSelfUserId,
						update: { type: "part", part: 1 },
					}),
				"FORBIDDEN",
				`Not enough rights to modify receipt "${foreignReceiptId}".`,
			);
		});

		test("receipt is locked", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: userId } = await insertUser(ctx, accountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				lockedTimestamp: new Date(),
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertReceiptParticipant(ctx, receiptId, userId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userId,
						update: { type: "part", part: 1 },
					}),
				"FORBIDDEN",
				`Receipt "${receiptId}" cannot be updated while locked.`,
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userId,
						update: { type: "part", part: 1 },
					}),
				"NOT_FOUND",
				`User "${userId}" does not participate in item "${receiptItemId}" of the receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("updates item participant part", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			await insertReceiptParticipant(ctx, receiptId, foreignUserId, {
				role: "editor",
				resolved: true,
			});
			await insertItemParticipant(ctx, receiptItemId, foreignUserId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptParticipant(ctx, receiptId, selfUserId, {
				role: "editor",
				resolved: true,
			});
			await insertItemParticipant(ctx, receiptItemId, selfUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					itemId: receiptItemId,
					userId: foreignUserId,
					update: { type: "part", part: faker.number.int({ max: 100 }) },
				}),
			);
		});
	});
});
