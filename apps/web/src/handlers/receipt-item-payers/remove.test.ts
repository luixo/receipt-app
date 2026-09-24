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

import { procedure } from "./remove";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItemPayers.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				itemId: faker.string.uuid(),
				peerId: faker.string.uuid(),
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
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
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
					}),
				"NOT_FOUND",
				`Receipt item "${fakeItemId}" does not exist.`,
			);
		});

		test("not enough rights to remove an item participant", async ({ ctx }) => {
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
					}),
				"FORBIDDEN",
				`Not enough rights to remove payer from item from receipt "${foreignReceiptId}".`,
			);
		});

		test("peer doesn't pay for this item", async ({ ctx }) => {
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
				() => caller.procedure({ itemId: receiptItemId, peerId }),
				"NOT_FOUND",
				`Peer "${peerId}" does not pay for item "${receiptItemId}" on receipt "${receiptId}" doesn't exist.`,
			);
		});
	});

	describe("functionality", () => {
		test("peer does not pay for item anymore", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: peerId } = await insertPeer(ctx, userId);
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertReceiptParticipant(ctx, receiptId, peerId, {
				role: "editor",
			});
			await insertReceiptParticipant(ctx, receiptId, anotherPeerId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertReceiptItemPayer(ctx, receiptItemId, peerId);
			await insertReceiptItemPayer(ctx, receiptItemId, anotherPeerId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			const { id: anotheritemId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, anotheritemId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ itemId: receiptItemId, peerId }),
			);
		});
	});
});
