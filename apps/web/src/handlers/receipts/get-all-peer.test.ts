import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
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
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { round } from "~utils/math";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-all-peer";

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

describe("debts.getAllPeer", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ peerId: faker.string.uuid() }),
		);

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ peerId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ peerId: nonExistentPeerId }),
				"NOT_FOUND",
				`Peer "${nonExistentPeerId}" does not exist.`,
			);
		});

		test("peer is not owned by account", async ({ ctx }) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);

			// Create a peer owned by a different account
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ peerId: foreignPeerId }),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>({ debts: [], receipts: [] });
		});

		test("multiple currency debts for single peer", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);
			const { id: otherPeerId } = await insertPeer(ctx, accountId);

			const peerDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];

			await Promise.all(
				peerDebts.map((debt) => insertDebt(ctx, accountId, peerId, debt)),
			);

			// Add debts for another peer in the same account (should not affect result)
			await insertDebt(ctx, accountId, otherPeerId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			// Verify other accounts' debts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignPeerId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });

			const mappedResult = {
				debts: fromEntries(
					result.debts.map(({ currencyCode, sum }) => [currencyCode, sum]),
				),
				receipts: [],
			};

			expect(mappedResult).toStrictEqual<typeof mappedResult>({
				debts: getSums(peerDebts),
				receipts: [],
			});
		});

		test("zero sum currency is included", async ({ ctx }) => {
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
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>({
				debts: [
					{
						currencyCode: "USD",
						sum: 0,
					},
				],
				receipts: [],
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
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: -amount,
				},
			]);
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
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>([
				{
					currencyCode: "USD",
					sum: 0.3,
				},
			]);
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
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
					{ currencyCode: "GBP", amount: getAmount() },
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId: firstPeerId }),
					() => caller.procedure({ peerId: secondPeerId }),
				]);
				const resultsEntries = results.map((result) =>
					fromEntries(
						result.map(({ currencyCode, sum }) => [currencyCode, sum]),
					),
				);
				expect(resultsEntries).toStrictEqual<typeof resultsEntries>([
					getSums(firstPeerDebts),
					getSums(secondPeerDebts),
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: firstPeerId } = await insertPeer(ctx, accountId);

				const firstPeerDebts = [
					{ currencyCode: "USD", amount: getAmount() },
					{ currencyCode: "USD", amount: getAmount() },
					{ currencyCode: "EUR", amount: getAmount() },
					{ currencyCode: "GBP", amount: getAmount() },
				];

				await Promise.all(
					firstPeerDebts.map((debt) =>
						insertDebt(ctx, accountId, firstPeerId, debt),
					),
				);
				const nonExistingPeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId: firstPeerId }),
					() => caller.procedure({ peerId: nonExistingPeerId }).catch((e) => e),
				]);
				const successfulEntries = fromEntries(
					results[0].map(({ currencyCode, sum }) => [currencyCode, sum]),
				);
				expect(successfulEntries).toStrictEqual<typeof successfulEntries>(
					getSums(firstPeerDebts),
				);
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
