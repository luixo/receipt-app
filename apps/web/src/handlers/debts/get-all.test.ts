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
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { round } from "~utils/math";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-all";

const getAmount = () =>
	Number(faker.finance.amount()) * (faker.datatype.boolean() ? 1 : -1);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getAll", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("multiple currency & users debts", async ({ ctx }) => {
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

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();

			const resultEntries = fromEntries(
				result.map(({ currencyCode, sum }) => [currencyCode, sum]),
			);

			const expectedDebts = mapValues(
				[...firstUserDebts, ...secondUserDebts].reduce<
					Record<CurrencyCode, number>
				>((acc, { currencyCode, amount }) => {
					if (!acc[currencyCode]) {
						acc[currencyCode] = 0;
					}
					acc[currencyCode] += amount;
					return acc;
				}, {}),
				(sum) => round(sum),
			);

			expect(resultEntries).toStrictEqual<typeof resultEntries>(expectedDebts);
		});

		test("zero sum", async ({ ctx }) => {
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
			const result = await caller.procedure();
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
			const result = await caller.procedure();
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
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: 0.3,
				},
			]);
		});
	});
});
