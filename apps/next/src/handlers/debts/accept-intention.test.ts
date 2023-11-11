import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { MINUTE } from "app/utils/time";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./accept-intention";
import { getRandomCurrencyCode } from "./utils.test";

const router = t.router({ procedure });

describe("debts.acceptIntention", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("debt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);

			const fakeDebtId = faker.string.uuid();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Intention for debt "${fakeDebtId}" is not found.`,
			);
		});

		test("our debt is not intended to be in sync", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({ ...originalDebt, lockedTimestamp: new Date() }),
				],
			);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, accountId, foreignToSelfUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"FORBIDDEN",
				`Debt "${debtId}" is not expected to be in sync.`,
			);
		});

		test("counterparty debt is not intended to be in sync", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date("2020-06-01") }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({ ...originalDebt, lockedTimestamp: null }),
				],
			);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, accountId, foreignToSelfUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"FORBIDDEN",
				`Counterparty debt "${debtId}" is not expected to be in sync.`,
			);
		});

		test("attempt to accept an old debt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date() }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({
						...originalDebt,
						lockedTimestamp: new Date(
							originalDebt.lockedTimestamp!.valueOf() - MINUTE,
						),
					}),
				],
			);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, accountId, foreignToSelfUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"FORBIDDEN",
				`The counterparty is intended to accept debt "${debtId}" as our timestamp is more fresh.`,
			);
		});
	});

	describe("functionality", () => {
		test("debt is synced - created", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{
					lockedTimestamp: new Date(),
					created: new Date("2020-05-01"),
					receiptId: foreignReceiptId,
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: foreignDebtId }),
			);
			expect(result).toStrictEqual<typeof result>({ created: new Date() });
		});

		test("debt is synced - updated", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [debt] = await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date("2020-06-01") }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({
						id: originalDebt.id,
						currencyCode: getRandomCurrencyCode(),
						amount: faker.finance.amount(),
						timestamp: new Date("2020-04-01"),
						created: new Date("2020-05-01"),
						note: faker.lorem.words(),
						lockedTimestamp: new Date("2020-06-02"),
						receiptId: foreignReceiptId,
					}),
				],
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({ created: debt.created });
		});
	});
});
