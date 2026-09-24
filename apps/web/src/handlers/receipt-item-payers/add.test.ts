import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

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
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItemPayers.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				itemId: faker.string.uuid(),
				peerId: faker.string.uuid(),
				part: 1,
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
							part: 1,
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
							part: 1,
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
							part: -1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be greater than 0`,
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
							part: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be non-zero`,
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
							part: 1.000001,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should have at maximum 5 decimals`,
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
							part: 10 ** 9 + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be less than 1 million`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeReceiptItemId,
						peerId: faker.string.uuid(),
						part: 1,
					}),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" does not exist.`,
			);
		});

		test("not enough rights to add an item participant", async ({ ctx }) => {
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						peerId: foreignToSelfPeerId,
						part: 1,
					}),
				"FORBIDDEN",
				`Not enough rights to add item to receipt "${foreignReceiptId}".`,
			);
		});

		describe("peer", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const fakePeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId: fakePeerId,
							part: 1,
						}),
					"PRECONDITION_FAILED",
					`Peer "${fakePeerId}" doesn't participate in receipt "${receiptId}".`,
				);
			});

			test("does not participate in the receipt", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const { id: peerId } = await insertPeer(ctx, foreignUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId,
							part: 1,
						}),
					"PRECONDITION_FAILED",
					`Peer "${peerId}" doesn't participate in receipt "${receiptId}".`,
				);
			});

			test("is already added to the item", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertReceipt(ctx, userId);

				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

				const { id: participantPeerId } = await insertPeer(ctx, userId);
				await insertReceiptParticipant(ctx, receiptId, participantPeerId);
				await insertReceiptItemPayer(ctx, receiptItemId, participantPeerId);
				const { id: anotherParticipantPeerId } = await insertPeer(ctx, userId);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					anotherParticipantPeerId,
				);
				await insertReceiptItemPayer(
					ctx,
					receiptItemId,
					anotherParticipantPeerId,
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId: participantPeerId,
							part: 1,
						}),
					"CONFLICT",
					`Peer "${participantPeerId}" already pays for item "${receiptItemId}".`,
				);
			});
		});

		describe("multiple participants", () => {
			test("duplicate tuples of peer id and item id", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const peer = await insertPeer(ctx, userId);
				await insertReceiptParticipant(ctx, receiptId, peer.id);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						runInBand([
							() =>
								caller.procedure({
									itemId: receiptItemId,
									peerId: peer.id,
									part: 1,
								}),
							() =>
								caller.procedure({
									itemId: receiptItemId,
									peerId: peer.id,
									part: 2,
								}),
						]),
					"CONFLICT",
					`Expected to have unique pair of item id and peer id, got repeating pairs: item "${receiptItemId}" / peer "${peer.id}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);

				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const peer = await insertPeer(ctx, userId);
				await insertReceiptParticipant(ctx, receiptId, peer.id);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runInBand([
						() =>
							caller.procedure({
								itemId: receiptItemId,
								peerId: peer.id,
								part: 1,
							}),
						() =>
							caller
								.procedure({
									itemId: receiptItemId,
									peerId: "not a valid uuid",
									part: 1,
								})
								.catch((error) => error),
					]),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					createdAt: Temporal.Now.zonedDateTimeISO(),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});

	describe("functionality", () => {
		test("multiple participants are added to multiple items in multiple receipts", async ({
			ctx,
		}) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			const { id: anotherReceiptItemId } = await insertReceiptItem(
				ctx,
				receiptId,
			);
			const peer = await insertPeer(ctx, userId);
			const { id: foreignUserId } = await insertUser(ctx);
			const [foreignPeer, foreignToSelfPeer] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);

			await insertReceiptParticipant(ctx, receiptId, selfPeerId);
			await insertReceiptParticipant(ctx, receiptId, peer.id);
			await insertReceiptParticipant(ctx, receiptId, foreignPeer.id);

			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeer.id,
				{ role: "editor" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherPeerId);
			await insertReceiptItem(ctx, anotherReceiptId);
			const { id: anotherForeignReceiptId } = await insertReceipt(
				ctx,
				foreignUserId,
			);
			await insertReceiptParticipant(
				ctx,
				anotherForeignReceiptId,
				foreignToSelfPeer.id,
			);
			await insertReceiptItem(ctx, anotherForeignReceiptId);
			await insertReceiptItemPayer(ctx, anotherReceiptItemId, peer.id);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId: selfPeerId,
							part: 1,
						}),
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId: peer.id,
							part: 0.1,
						}),
					() =>
						caller.procedure({
							itemId: receiptItemId,
							peerId: foreignPeer.id,
							part: 3,
						}),
					() =>
						caller.procedure({
							itemId: anotherReceiptItemId,
							peerId: selfPeerId,
							part: 1,
						}),
					() =>
						caller.procedure({
							itemId: anotherReceiptItemId,
							peerId: foreignPeer.id,
							part: 2,
						}),
					() =>
						caller.procedure({
							itemId: foreignReceiptItemId,
							peerId: foreignToSelfPeer.id,
							part: 1,
						}),
				]),
			);
			expect(results).toStrictEqual<typeof results>([
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
			]);
		});
	});
});
