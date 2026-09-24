import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { fromEntries, mapValues } from "remeda";
import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertDebt,
	insertPeer,
	insertUser,
	insertUserWithSession,
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
			(acc, { currencyCode, amount }) => ({
				...acc,
				[currencyCode]: (acc[currencyCode] ?? 0) + amount,
			}),
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ peerId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ peerId: nonExistentPeerId }),
				"NOT_FOUND",
				`Peer "${nonExistentPeerId}" does not exist.`,
			);
		});

		test("peer is not owned by  user", async ({ ctx }) => {
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx);

			// Create a peer owned by a different  user
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);

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
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			// Verify other users' debts don't affect the result
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, foreignUserId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>({ items: [] });
		});

		test("multiple currency debts for single peer", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const { id: otherPeerId } = await insertPeer(ctx, userId);

			const peerDebts = [
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "USD", amount: getAmount() },
				{ currencyCode: "EUR", amount: getAmount() },
				{ currencyCode: "GBP", amount: getAmount() },
			];

			await Promise.all(
				peerDebts.map((debt) => insertDebt(ctx, userId, peerId, debt)),
			);

			// Add debts for another peer in the same  user (should not affect result)
			await insertDebt(ctx, userId, otherPeerId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			// Verify other users' debts don't affect the result
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, foreignUserId, foreignPeerId, {
				currencyCode: "USD",
				amount: getAmount(),
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });

			const resultEntries = fromEntries(
				result.items.map(({ currencyCode, sum }) => [currencyCode, sum]),
			);

			expect(resultEntries).toStrictEqual<typeof resultEntries>(
				getSums(peerDebts),
			);
		});

		test("zero sum currency is included", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			const amount = getAmount();
			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount: -amount,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });
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
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			const amount = getAmount();
			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount,
			});
			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount: -2 * amount,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });
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
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount: 0.1,
			});
			await insertDebt(ctx, userId, peerId, {
				currencyCode: "USD",
				amount: 0.2,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId });
			expect(result).toStrictEqual<typeof result>({
				items: [
					{
						currencyCode: "USD",
						sum: 0.3,
					},
				],
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: firstPeerId } = await insertPeer(ctx, userId);
				const { id: secondPeerId } = await insertPeer(ctx, userId);

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
							insertDebt(ctx, userId, firstPeerId, debt),
						),
					),
					Promise.all(
						secondPeerDebts.map((debt) =>
							insertDebt(ctx, userId, secondPeerId, debt),
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
						result.items.map(({ currencyCode, sum }) => [currencyCode, sum]),
					),
				);
				expect(resultsEntries).toStrictEqual<typeof resultsEntries>([
					getSums(firstPeerDebts),
					getSums(secondPeerDebts),
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: firstPeerId } = await insertPeer(ctx, userId);

				const firstPeerDebts = [
					{ currencyCode: "USD", amount: getAmount() },
					{ currencyCode: "USD", amount: getAmount() },
					{ currencyCode: "EUR", amount: getAmount() },
					{ currencyCode: "GBP", amount: getAmount() },
				];

				await Promise.all(
					firstPeerDebts.map((debt) =>
						insertDebt(ctx, userId, firstPeerId, debt),
					),
				);
				const nonExistingPeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId: firstPeerId }),
					() =>
						caller
							.procedure({ peerId: nonExistingPeerId })
							.catch((error) => error),
				]);
				const successfulEntries = fromEntries(
					results[0].items.map(({ currencyCode, sum }) => [currencyCode, sum]),
				);
				expect(successfulEntries).toStrictEqual<typeof successfulEntries>(
					getSums(firstPeerDebts),
				);
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
