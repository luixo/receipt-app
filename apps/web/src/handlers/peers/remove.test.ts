import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertDebt,
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

describe("peers.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("peer not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			// Verifying adding other peers doesn't affect the error
			await insertPeer(ctx, userId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentPeerId,
					}),
				"NOT_FOUND",
				`No peer found by id "${nonExistentPeerId}".`,
			);
		});

		test("peer is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherUserId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignPeerId,
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("peer is removed", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: anotherUserId } = await insertUser(ctx);
			const { id: peerId } = await insertPeer(ctx, userId, {
				connectedUserId: anotherUserId,
			});
			// Verify other peers are not affected
			const { id: otherPeerId } = await insertPeer(ctx, userId);
			// Verify receipt is not affected
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptParticipant(ctx, receiptId, peerId);
			const { id: itemId } = await insertReceiptItem(ctx, receiptId);
			// Verify item participant is removed from an item on peer removal
			await insertReceiptItemConsumer(ctx, itemId, peerId);
			// Verify other peers in the receipt are not affected
			await insertReceiptParticipant(ctx, receiptId, otherPeerId);
			await insertReceiptItemConsumer(ctx, itemId, otherPeerId);

			// Verify receipt with peer not participating is not affected
			const { id: otherReceiptId } = await insertReceipt(ctx, userId);
			// Verify other peers in other receipts are not affected
			await insertReceiptParticipant(ctx, otherReceiptId, otherPeerId);

			// Verify peer debt is removed on peer removal
			await insertDebt(ctx, userId, peerId);
			// Verify other peer debts are not affected
			await insertDebt(ctx, userId, otherPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: peerId }),
			);
		});
	});
});
