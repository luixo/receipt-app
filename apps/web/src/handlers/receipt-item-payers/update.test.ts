import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemPayer,
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

import { procedure } from "./update";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItemPayers.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				itemId: faker.string.uuid(),
				peerId: faker.string.uuid(),
				update: { type: "part", part: 1 },
			}),
		);

		describe("itemId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: "not-a-uuid",
							peerId: faker.string.uuid(),
							update: { type: "part", part: 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "itemId": Invalid UUID`,
				);
			});
		});

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							peerId: "not-a-uuid",
							update: { type: "part", part: 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("part", () => {
			test("negative", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							peerId: faker.string.uuid(),
							update: { type: "part", part: -1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be greater than 0`,
				);
			});

			test("zero", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							peerId: faker.string.uuid(),
							update: { type: "part", part: 0 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be non-zero`,
				);
			});

			test("fraction precision", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							peerId: faker.string.uuid(),
							update: { type: "part", part: 1.000001 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should have at maximum 5 decimals`,
				);
			});

			test("too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							peerId: faker.string.uuid(),
							update: { type: "part", part: 10 ** 9 + 1 },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update.part": Part should be less than 1 million`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, receiptId);
			const fakeItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeItemId,
						peerId: faker.string.uuid(),
						update: { type: "part", part: 1 },
					}),
				"NOT_FOUND",
				`Receipt item "${fakeItemId}" does not exist.`,
			);
		});

		test("not enough rights to modify an item participant", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeerId,
				{ role: "viewer" },
			);
			const { id: receiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);
			await insertReceiptItemPayer(ctx, receiptItemId, foreignToSelfPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						peerId: foreignToSelfPeerId,
						update: { type: "part", part: 1 },
					}),
				"FORBIDDEN",
				`Not enough rights to modify receipt "${foreignReceiptId}".`,
			);
		});

		test("peer does not pay for item", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: peerId } = await insertPeer(ctx, userId);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptParticipant(ctx, receiptId, peerId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertReceiptItemPayer(ctx, receiptItemId, selfPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						peerId,
						update: { type: "part", part: 1 },
					}),
				"NOT_FOUND",
				`Peer "${peerId}" does not pay for item "${receiptItemId}" of the receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("updates item participant payment part", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);
			await insertReceiptParticipant(ctx, receiptId, foreignPeerId, {
				role: "editor",
			});
			await insertReceiptItemPayer(ctx, receiptItemId, foreignPeerId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptParticipant(ctx, receiptId, selfPeerId, {
				role: "editor",
			});
			await insertReceiptItemPayer(ctx, receiptItemId, selfPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					itemId: receiptItemId,
					peerId: foreignPeerId,
					update: {
						type: "part",
						part: faker.number.int({ min: 1, max: 100 }),
					},
				}),
			);
		});
	});
});
