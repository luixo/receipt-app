import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
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

describe("receiptParticipants.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				peerId: faker.string.uuid(),
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: "not-a-uuid",
							peerId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid UUID`,
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
							receiptId: faker.string.uuid(),
							peerId: "not-a-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, userId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: fakeReceiptId,
						peerId: faker.string.uuid(),
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		test("receipt is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: foreignReceiptId,
						peerId: faker.string.uuid(),
					}),
				"FORBIDDEN",
				`Not enough rights to remove participant from receipt "${foreignReceiptId}".`,
			);
		});

		describe("peer", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const fakePeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId, peerId: fakePeerId }),
					"NOT_FOUND",
					`Peer "${fakePeerId}" does not exist.`,
				);
			});

			test("is not owned by the  user", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					user: { email },
				} = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId, peerId: foreignPeerId }),
					"FORBIDDEN",
					`Peer "${foreignPeerId}" is not owned by "${email}".`,
				);
			});

			test("is not participating in the receipt", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertReceipt(ctx, userId);

				const { id: notParticipantPeerId } = await insertPeer(ctx, userId);
				const { id: receiptId } = await insertReceipt(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: notParticipantPeerId,
						}),
					"CONFLICT",
					`Peer "${notParticipantPeerId}" does not participate in receipt "${receiptId}".`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("peer is removed", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: peerId } = await insertPeer(ctx, userId);
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertReceiptParticipant(ctx, receiptId, peerId, {
				role: "editor",
			});
			await insertReceiptParticipant(ctx, receiptId, anotherPeerId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			await insertReceiptItemConsumer(ctx, receiptItemId, peerId);
			await insertReceiptItemConsumer(ctx, receiptItemId, anotherPeerId);

			// Verify unrelated data doesn't affect the result
			await insertReceiptItem(ctx, receiptId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ receiptId, peerId }),
			);
		});
	});
});
