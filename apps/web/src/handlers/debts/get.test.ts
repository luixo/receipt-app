import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.get", () => {
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

		test("debt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other debts doesn't affect the error
			const { id: userId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeDebtId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Debt "${fakeDebtId}" does not exist or you don't have access to it.`,
			);
		});

		test("debt is not owned by the account", async ({ ctx }) => {
			// Self account
			const { sessionId } = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignDebtId }),
				"NOT_FOUND",
				`Debt "${foreignDebtId}" does not exist or you don't have access to it.`,
			);
		});
	});

	describe("functionality", () => {
		test("debt is fetched", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const debt = await insertDebt(ctx, accountId, userId);

			// Verify other users do not interfere
			const { id: otherUserId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, otherUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: debt.id });
			expect(result).toStrictEqual<typeof result>({
				id: debt.id,
				userId,
				currencyCode: debt.currencyCode,
				timestamp: debt.timestamp,
				note: debt.note,
				receiptId: debt.receiptId || undefined,
				amount: Number(debt.amount),
				lockedTimestamp: debt.lockedTimestamp,
				their: undefined,
			});
		});

		describe("both counterparties' debts exist", () => {
			test("foreign sync intended", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: userId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const [debt, foreignDebt] = await insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
					{ ahead: "their" },
				);

				// Verify other users do not interfere
				const { id: otherUserId } = await insertUser(ctx, accountId);
				await insertDebt(ctx, accountId, otherUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: debt.id });
				expect(result).toStrictEqual<typeof result>({
					id: debt.id,
					userId,
					currencyCode: debt.currencyCode,
					timestamp: debt.timestamp,
					note: debt.note,
					receiptId: debt.receiptId || undefined,
					amount: Number(debt.amount),
					lockedTimestamp: debt.lockedTimestamp,
					their: {
						lockedTimestamp: foreignDebt.lockedTimestamp,
						currencyCode: foreignDebt.currencyCode,
						timestamp: foreignDebt.timestamp,
						amount: -Number(foreignDebt.amount),
					},
				});
			});
		});
	});
});
