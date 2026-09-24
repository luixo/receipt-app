import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertPeer,
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
import { verifyReceiptId } from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receipts.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		verifyReceiptId(
			(context, receiptId) =>
				createCaller(context).procedure({
					id: receiptId,
				}),
			"",
		);

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: nonExistentReceiptId }),
				"NOT_FOUND",
				`No receipt found by id "${nonExistentReceiptId}".`,
			);
		});

		test("receipt is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const {
				sessionId,
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, otherUserId);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptId }),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("receipt is removed", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			await insertReceiptParticipant(ctx, receiptId, peerId);
			await insertReceiptParticipant(ctx, receiptId, selfPeerId);
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			await insertReceiptParticipant(ctx, anotherReceiptId, peerId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeer } = await insertPeer(ctx, foreignUserId);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(ctx, foreignReceiptId, foreignPeer);
			await insertReceiptItem(ctx, foreignReceiptId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptId }),
			);
		});
	});
});
