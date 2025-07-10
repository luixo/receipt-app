import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { add, getNow } from "~utils/date";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode, runInBand } from "~web/handlers/utils.test";

import { procedure } from "./accept";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debtIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("debt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);

			const fakeDebtId = faker.string.uuid();
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Intention for debt "${fakeDebtId}" is not found.`,
			);
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [, { id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{
					createdAt: new Date("2020-05-01"),
					receiptId: foreignReceiptId,
				},
			);

			const fakeDebtId = faker.string.uuid();

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure({ id: foreignDebtId }),
					() => caller.procedure({ id: fakeDebtId }).catch((e) => e),
				]),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				updatedAt: getNow(),
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
		});
	});

	describe("functionality", () => {
		test("debt did not exist on our account beforehand", async ({ ctx }) => {
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
					createdAt: new Date("2020-05-01"),
					receiptId: foreignReceiptId,
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: foreignDebtId }),
			);
			expect(result).toStrictEqual<typeof result>({ updatedAt: getNow() });
		});

		test("debt existed on our account beforehand - their updatedAt ahead", async ({
			ctx,
		}) => {
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
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: originalDebt.amount + 1,
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
					ahead: "their",
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({
				updatedAt: add(debt.updatedAt, { minutes: 1 }),
			});
		});

		test("debt existed on our account beforehand - our updatedAt ahead", async ({
			ctx,
		}) => {
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
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({
				updatedAt: add(debt.updatedAt, { minutes: 1 }),
			});
		});

		test("multiple different debts with multiple users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: selfUserId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: anotherForeignAccountId } = await insertAccount(ctx);
			const [{ id: anotherSelfUserId }, { id: anotherForeignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, anotherForeignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			// A new debt
			const newDebt = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{ createdAt: new Date("2020-05-01") },
			);
			// A connected with our updatedAt ahead
			const [updatedDebtAhead] = await insertSyncedDebts(
				ctx,
				[accountId, selfUserId],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
				},
			);
			// A connected with their updatedAt ahead
			const [updatedDebtBehind] = await insertSyncedDebts(
				ctx,
				[accountId, anotherSelfUserId],
				[anotherForeignAccountId, anotherForeignToSelfUserId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: originalDebt.amount + 1,
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
					}),
					ahead: "their",
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, selfUserId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure({ id: newDebt.id }),
					() => caller.procedure({ id: updatedDebtAhead.id }),
					() => caller.procedure({ id: updatedDebtBehind.id }),
				]),
			);
			expect(result).toStrictEqual<typeof result>([
				{ updatedAt: newDebt.updatedAt },
				{ updatedAt: add(updatedDebtAhead.updatedAt, { minutes: 1 }) },
				{ updatedAt: add(updatedDebtBehind.updatedAt, { minutes: 1 }) },
			]);
		});
	});
});
