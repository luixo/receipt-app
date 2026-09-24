import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { assert, describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import type { PeerId, UserId } from "~db/ids";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertSyncedDebts,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import { getRandomAmount } from "~web/handlers/debts/utils.test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-by-peer-paged";

const mapDebts = (debts: Awaited<ReturnType<typeof insertDebt>>[]) =>
	debts
		.toSorted((a, b) => {
			const timestampSort = Temporal.PlainDate.compare(
				a.timestamp,
				b.timestamp,
			);
			if (timestampSort !== 0) {
				return timestampSort;
			}
			return a.id.localeCompare(b.id);
		})
		.map((debt) => debt.id);

const insertDebts = async (
	ctx: TestContext,
	userId: UserId,
	peerId: PeerId,
) => {
	// Create debts with non-zero sum currencies
	const nonResolvedDebts = await Promise.all([
		insertDebt(ctx, userId, peerId, {
			currencyCode: "USD",
			amount: 100,
		}),
		insertDebt(ctx, userId, peerId, { currencyCode: "USD", amount: 50 }),
		insertDebt(ctx, userId, peerId, { currencyCode: "EUR", amount: 25 }),
	]);

	// Create debts that resolve to zero (should be excluded by default)
	const resolvedAmount = getRandomAmount();
	const resolvedDebts = await Promise.all([
		insertDebt(ctx, userId, peerId, {
			currencyCode: "GEL",
			amount: resolvedAmount,
		}),
		insertDebt(ctx, userId, peerId, {
			currencyCode: "GEL",
			amount: -resolvedAmount,
		}),
	]);
	return [nonResolvedDebts, resolvedDebts] as const;
};

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getByPeerPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				cursor: 0,
				limit: 1,
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: 0,
							limit: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: 0,
							limit: MAX_LIMIT + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: 0,
							limit: faker.number.float(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Invalid input: expected int, received number`,
				);
			});
		});

		describe("cursor", () => {
			test("is < 0", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: -1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: MAX_OFFSET + 1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: faker.number.float(),
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Invalid input: expected int, received number`,
				);
			});
		});

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: "not-a-valid-uuid",
							cursor: 0,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		test("peer not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Verifying adding other peers doesn't affect the error
			await insertPeer(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakerPeerId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ peerId: fakerPeerId, cursor: 0, limit: 1 }),
				"NOT_FOUND",
				`Peer "${fakerPeerId}" does not exist.`,
			);
		});

		test("peer is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ peerId: foreignPeerId, cursor: 0, limit: 1 }),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);

			await insertDebt(ctx, foreignUserId, foreignToSelfPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId, cursor: 0, limit: 1 });
			expect(result).toStrictEqual<typeof result>({
				items: [],
				count: 0,
				cursor: 0,
			});
		});

		test("peer debts", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const syncedDebts = await Promise.all([
				insertSyncedDebts(
					ctx,
					[userId, peerId],
					[foreignUserId, foreignToSelfPeerId],
				),
				insertSyncedDebts(
					ctx,
					[userId, peerId],
					[foreignUserId, foreignToSelfPeerId],
				),
				insertSyncedDebts(
					ctx,
					[userId, peerId],
					[foreignUserId, foreignToSelfPeerId],
					{
						ahead: "their",
						fn: (originalDebt) => ({
							...originalDebt,
							amount: originalDebt.amount + 1,
						}),
					},
				),
			]);
			const peerDebts = await Promise.all([
				insertDebt(ctx, userId, peerId),
				insertDebt(ctx, userId, peerId),
			]);

			// Verify other peers and users don't affect the result
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, anotherPeerId);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, foreignUserId, foreignPeerId);

			const debts = mapDebts([
				...peerDebts,
				...syncedDebts.map(([ours]) => ours),
			]);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				items: debts,
				count: debts.length,
				cursor: 0,
			});
		});

		test("without resolved currencies", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			const [nonResolvedDebts] = await insertDebts(ctx, userId, peerId);
			// Verify other peers don't affect the result
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, anotherPeerId, { currencyCode: "GEL" });

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				count: nonResolvedDebts.length,
				cursor: 0,
				items: mapDebts(nonResolvedDebts),
			});
		});

		test("with resolved currencies", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			const [nonResolvedDebts, resolvedDebts] = await insertDebts(
				ctx,
				userId,
				peerId,
			);

			const allDebts = [...nonResolvedDebts, ...resolvedDebts];

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId,
				cursor: 0,
				limit: 100,
				filters: { showResolved: true },
			});
			expect(result).toStrictEqual<typeof result>({
				count: allDebts.length,
				cursor: 0,
				items: mapDebts(allDebts),
			});
		});

		test("all currencies resolved", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			await Array.fromAsync({ length: 5 }, async (_, index) => {
				const currencyCode = CURRENCY_CODES[index];
				const amount = getRandomAmount();
				await insertDebt(ctx, userId, peerId, {
					currencyCode,
					amount,
				});
				await insertDebt(ctx, userId, peerId, {
					currencyCode,
					amount: -amount,
				});
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ peerId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("paged result", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const peerDebts = await Array.fromAsync({ length: 5 }, () =>
				insertDebt(ctx, userId, peerId, { currencyCode: "USD" }),
			);

			const limit = 3;
			const cursor = 1;
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId,
				cursor,
				limit,
			});
			expect(result).toStrictEqual<typeof result>({
				count: peerDebts.length,
				cursor,
				items: mapDebts(peerDebts).slice(1, limit + 1),
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: peerId } = await insertPeer(ctx, userId);
				const { id: anotherPeerId } = await insertPeer(ctx, userId);
				const peerDebts = await Array.fromAsync({ length: 12 }, (_, index) =>
					insertDebt(ctx, userId, peerId, {
						currencyCode: index <= 1 ? "EUR" : "USD",
						amount: index === 0 ? 100 : index === 1 ? -100 : undefined,
					}),
				);
				const nonResolvedPeerDebts = mapDebts(peerDebts);
				const resolvedPeerDebts = mapDebts(
					peerDebts.filter((debt) => debt.currencyCode !== "EUR"),
				);
				const anotherPeerDebts = mapDebts(
					await Array.fromAsync({ length: 4 }, () =>
						insertDebt(ctx, userId, anotherPeerId, {
							currencyCode: "EUR",
						}),
					),
				);
				assert(
					nonResolvedPeerDebts.length !== resolvedPeerDebts.length,
					"Resolved and non-resolved debts has to be different for test to make sense",
				);

				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId, cursor: 0, limit }),
					() => caller.procedure({ peerId, cursor: 2, limit }),
					() =>
						caller.procedure({
							peerId,
							cursor: 2,
							limit,
							filters: { showResolved: true },
						}),
					() => caller.procedure({ peerId, cursor: 6, limit }),
					() => caller.procedure({ peerId: anotherPeerId, cursor: 2, limit }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: resolvedPeerDebts.length,
						cursor: 0,
						items: resolvedPeerDebts.slice(0, 2),
					},
					{
						count: resolvedPeerDebts.length,
						cursor: 2,
						items: resolvedPeerDebts.slice(2, 4),
					},
					{
						count: nonResolvedPeerDebts.length,
						cursor: 2,
						items: nonResolvedPeerDebts.slice(2, 4),
					},
					{
						count: resolvedPeerDebts.length,
						cursor: 6,
						items: resolvedPeerDebts.slice(6, 8),
					},
					{
						count: anotherPeerDebts.length,
						cursor: 2,
						items: anotherPeerDebts.slice(2, 4),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: peerId } = await insertPeer(ctx, userId);
				const debts = mapDebts(
					await Array.fromAsync({ length: 4 }, () =>
						insertDebt(ctx, userId, peerId, { currencyCode: "USD" }),
					),
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId, cursor: 0, limit: 2 }),
					() =>
						caller
							.procedure({ peerId: faker.string.uuid(), cursor: 2, limit: 2 })
							.catch((error) => error),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: debts.length,
					cursor: 0,
					items: debts.slice(0, 2),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
