import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: nonExistentReceiptId }),
				"NOT_FOUND",
				`No receipt found by id "${nonExistentReceiptId}".`,
			);
		});

		test("receipt is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, otherAccountId);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

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
				accountId,
				peerId: selfPeerId,
			} = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, peerId);
			await insertReceiptParticipant(ctx, receiptId, selfPeerId);
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptItem(ctx, receiptId);
			await insertReceiptItem(ctx, receiptId);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, peerId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeer } = await insertPeer(ctx, foreignAccountId);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(ctx, foreignReceiptId, foreignPeer);
			await insertReceiptItem(ctx, foreignReceiptId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: receiptId }),
			);
		});
	});
});
