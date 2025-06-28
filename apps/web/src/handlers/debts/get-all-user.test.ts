import { faker } from "@faker-js/faker";
import { fromEntries, mapValues } from "remeda";
import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertDebt,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { round } from "~utils/math";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-all-user";

const getSums = (debts: { currencyCode: CurrencyCode; amount: number }[]) =>
	mapValues(
		debts.reduce<Record<CurrencyCode, number>>(
			(acc, { currencyCode, amount }) => {
				if (!acc[currencyCode]) {
					acc[currencyCode] = 0;
				}
				acc[currencyCode] += amount;
				return acc;
			},
			{},
		),
		(sum) => round(sum),
	);

const getAmount = () =>
	Number(faker.finance.amount()) * (faker.datatype.boolean() ? 1 : -1);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getAllUser", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ userId: faker.string.uuid() }),
		);

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ userId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		test("user does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ userId: nonExistentUserId }),
				"NOT_FOUND",
				`User "${nonExistentUserId}" does not exist.`,
			);
		});

		test("user is not owned by account", async ({ ctx }) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);

			// Create a user owned by a different account
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ userId: foreignUserId }),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("multiple currency debts for single user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const { id: otherUserId } = await insertUser(ctx, accountId);

			const userDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];

			await Promise.all(
				userDebts.map((debt) => insertDebt(ctx, accountId, userId, debt)),
			);

			// Add debts for another user in the same account (should not affect result)
			await insertDebt(ctx, accountId, otherUserId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });

			const resultEntries = fromEntries(
				result.map(({ currencyCode, sum }) => [currencyCode, sum]),
			);

			expect(resultEntries).toStrictEqual<typeof resultEntries>(
				getSums(userDebts),
			);
		});

		test("zero sum currency is included", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			const amount = getAmount();
			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount: -amount,
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: 0,
				},
			]);
		});

		test("negative sum", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			const amount = getAmount();
			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount: -2 * amount,
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: -amount,
				},
			]);
		});

		test("sums are parsed on DB side", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount: 0.1,
			});
			await insertDebt(ctx, accountId, userId, {
				currencyCode: "USD",
				amount: 0.2,
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: 0.3,
				},
			]);
		});

		test("multiple intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: firstUserId } = await insertUser(ctx, accountId);
			const { id: secondUserId } = await insertUser(ctx, accountId);

			const firstUserDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];
			const secondUserDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];

			await Promise.all([
				Promise.all(
					firstUserDebts.map((debt) =>
						insertDebt(ctx, accountId, firstUserId, debt),
					),
				),
				Promise.all(
					secondUserDebts.map((debt) =>
						insertDebt(ctx, accountId, secondUserId, debt),
					),
				),
			]);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await runInBand([
				() => caller.procedure({ userId: firstUserId }),
				() => caller.procedure({ userId: secondUserId }),
			]);
			const resultsEntries = results.map((result) =>
				fromEntries(result.map(({ currencyCode, sum }) => [currencyCode, sum])),
			);
			expect(resultsEntries).toStrictEqual<typeof resultsEntries>([
				getSums(firstUserDebts),
				getSums(secondUserDebts),
			]);
		});
	});
});
