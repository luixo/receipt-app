import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountConnectionIntention,
	insertAccountWithSession,
	insertDebt,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
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

describe("users.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentUserId,
					}),
				"NOT_FOUND",
				`No user found by id "${nonExistentUserId}".`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("user is removed", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: anotherAccountId } = await insertAccount(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			// Verify other users are not affected
			const { id: otherUserId } = await insertUser(ctx, accountId);
			// Verify account connection intention is removed on user removal
			await insertAccountConnectionIntention(
				ctx,
				accountId,
				anotherAccountId,
				userId,
			);

			// Verify receipt is not affected
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, userId);
			const { id: itemId } = await insertReceiptItem(ctx, receiptId);
			// Verify item participant is removed from an item on user removal
			await insertReceiptItemConsumer(ctx, itemId, userId);
			// Verify other users in the receipt are not affected
			await insertReceiptParticipant(ctx, receiptId, otherUserId);
			await insertReceiptItemConsumer(ctx, itemId, otherUserId);

			// Verify receipt with user not participating is not affected
			const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
			// Verify other users in other receipts are not affected
			await insertReceiptParticipant(ctx, otherReceiptId, otherUserId);

			// Verify user debt is removed on user removal
			await insertDebt(ctx, accountId, userId);
			// Verify other user debts are not affected
			await insertDebt(ctx, accountId, otherUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: userId }),
			);
		});
	});
});
