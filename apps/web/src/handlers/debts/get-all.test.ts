import { faker } from "@faker-js/faker";
import { fromEntries, mapValues } from "remeda";
import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertDebt,
	insertPeer,
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
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({ items: [] });
		});

		test("multiple currency & peers debts", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: firstPeerId } = await insertPeer(ctx, accountId);
			const { id: secondPeerId } = await insertPeer(ctx, accountId);

			const firstPeerDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];
			const secondPeerDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
			];
			await Promise.all([
				Promise.all(
					firstPeerDebts.map((debt) =>
						insertDebt(ctx, accountId, firstPeerId, debt),
					),
				),
				Promise.all(
					secondPeerDebts.map((debt) =>
						insertDebt(ctx, accountId, secondPeerId, debt),
					),
				),
			]);

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignPeerId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();

			const resultEntries = fromEntries(
				result.items.map(({ currencyCode, sum }) => [currencyCode, sum]),
			);

			const expectedDebts = mapValues(
				[...firstPeerDebts, ...secondPeerDebts].reduce<
					Record<CurrencyCode, number>
				>(
					(acc, { currencyCode, amount }) => ({
						...acc,
						[currencyCode]: (acc[currencyCode] ?? 0) + amount,
					}),
					{},
				),
				(sum) => round(sum),
			);

			expect(resultEntries).toStrictEqual<typeof resultEntries>(expectedDebts);
		});

		test("zero sum", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			const amount = getAmount();
			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount: -amount,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				items: [
					{
						currencyCode: "USD",
						sum: 0,
					},
				],
			});
		});

		test("negative sum", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			const amount = getAmount();
			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount: -2 * amount,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				items: [
					{
						currencyCode: "USD",
						sum: -amount,
					},
				],
			});
		});

		test("sums are parsed on DB side", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount: 0.1,
			});
			await insertDebt(ctx, accountId, peerId, {
				currencyCode: "USD",
				amount: 0.2,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>({
				items: [
					{
						currencyCode: "USD",
						sum: 0.3,
					},
				],
			});
		});
	});
});
