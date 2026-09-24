import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { assert, describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
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
import { test } from "~tests/backend/utils/test";
import { getRandomAmount } from "~web/handlers/debts/utils.test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-peers-paged";

const mapPeers = (
	peerDebts: {
		peer: Awaited<ReturnType<typeof insertPeer>>;
	}[],
) =>
	peerDebts
		.map(({ peer }) => peer)
		.toSorted((peerA, peerB) => peerA.name.localeCompare(peerB.name))
		.map(({ id }) => id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getPeersPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ cursor: 0, limit: 10 }),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: MAX_LIMIT + 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: faker.number.float() }),
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
					() => caller.procedure({ cursor: -1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: MAX_OFFSET + 1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: faker.number.float(), limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Invalid input: expected int, received number`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);

			await insertDebt(ctx, foreignUserId, foreignToSelfPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ cursor: 0, limit: 10 });
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("without resolved peers", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [peer, { id: foreignToSelfPeerId }] = await insertConnectedPeers(
				ctx,
				[userId, foreignUserId],
			);
			const [syncedDebt] = await insertSyncedDebts(
				ctx,
				[userId, peer.id, { currencyCode: "USD" }],
				[foreignUserId, foreignToSelfPeerId],
			);
			const peerDebts = await Promise.all([
				Promise.resolve(syncedDebt),
				insertDebt(ctx, userId, peer.id, { currencyCode: "USD" }),
				insertDebt(ctx, userId, peer.id, { currencyCode: "EUR" }),
				insertDebt(ctx, foreignUserId, foreignToSelfPeerId),
			]);

			const anotherPeer = await insertPeer(ctx, userId);
			const anotherPeerDebts = await Promise.all([
				insertDebt(ctx, userId, anotherPeer.id, { currencyCode: "USD" }),
				insertDebt(ctx, userId, anotherPeer.id, { currencyCode: "USD" }),
				insertDebt(ctx, userId, anotherPeer.id, { currencyCode: "EUR" }),
				insertDebt(ctx, userId, anotherPeer.id, { currencyCode: "GEL" }),
			]);

			const resolvedPeer = await insertPeer(ctx, userId);
			const resolvedAmount = getRandomAmount();
			await Promise.all([
				insertDebt(ctx, userId, resolvedPeer.id, {
					currencyCode: "USD",
					amount: resolvedAmount,
				}),
				insertDebt(ctx, userId, resolvedPeer.id, {
					currencyCode: "USD",
					amount: -resolvedAmount,
				}),
			]);

			// Verify other users peers don't affect the result
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, foreignUserId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ cursor: 0, limit: 10 });
			const peers = [
				{ peer, debts: peerDebts },
				{ peer: anotherPeer, debts: anotherPeerDebts },
			];
			expect(result).toStrictEqual<typeof result>({
				count: peers.length,
				cursor: 0,
				items: mapPeers(peers),
			});
		});

		test("with resolved peers", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const peer = await insertPeer(ctx, userId);
			const peerDebts = await Promise.all([
				insertDebt(ctx, userId, peer.id, { currencyCode: "USD" }),
				insertDebt(ctx, userId, peer.id, { currencyCode: "EUR" }),
			]);

			const resolvedPeer = await insertPeer(ctx, userId);
			const resolvedAmount = getRandomAmount();
			const resolvedPeerDebts = await Promise.all([
				insertDebt(ctx, userId, resolvedPeer.id, {
					currencyCode: "USD",
					amount: resolvedAmount,
				}),
				insertDebt(ctx, userId, resolvedPeer.id, {
					currencyCode: "USD",
					amount: -resolvedAmount,
				}),
			]);

			// Verify other users peers don't affect the result
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, foreignUserId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				cursor: 0,
				limit: 10,
				filters: { showResolved: true },
			});
			const peers = [
				{ peer, debts: peerDebts },
				{ peer: resolvedPeer, debts: resolvedPeerDebts },
			];
			expect(result).toStrictEqual<typeof result>({
				count: peers.length,
				cursor: 0,
				items: mapPeers(peers),
			});
		});

		test("paged result", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const peers = await Array.fromAsync({ length: 5 }, async () => {
				const peer = await insertPeer(ctx, userId);
				const debt = await insertDebt(ctx, userId, peer.id, {
					currencyCode: "USD",
				});
				return { peer, debts: [debt] };
			});

			const limit = 3;
			const cursor = 1;
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				cursor,
				limit,
				filters: { showResolved: true },
			});
			expect(result).toStrictEqual<typeof result>({
				count: peers.length,
				cursor,
				items: mapPeers(peers).slice(1, limit + 1),
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const peersDebts = await Array.fromAsync(
					{ length: 12 },
					async (_, index) => {
						const peer = await insertPeer(ctx, userId);
						const debts = [
							await insertDebt(ctx, userId, peer.id, {
								currencyCode: "USD",
							}),
						];
						if (index <= 1) {
							assert(debts[0]);
							debts.push(
								await insertDebt(ctx, userId, peer.id, {
									currencyCode: "USD",
									amount: -debts[0].amount,
								}),
							);
						}
						return { peer, debts };
					},
				);
				const nonResolvedPeers = mapPeers(peersDebts);
				const resolvedPeers = mapPeers(
					peersDebts.filter(({ debts }) => debts.length === 1),
				);
				assert(
					nonResolvedPeers.length !== resolvedPeers.length,
					"Resolved and non-resolved peers has to be different for test to make sense",
				);

				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ cursor: 0, limit }),
					() => caller.procedure({ cursor: 2, limit }),
					() =>
						caller.procedure({
							cursor: 2,
							limit,
							filters: { showResolved: true },
						}),
					() => caller.procedure({ cursor: 6, limit }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: resolvedPeers.length,
						cursor: 0,
						items: resolvedPeers.slice(0, 2),
					},
					{
						count: resolvedPeers.length,
						cursor: 2,
						items: resolvedPeers.slice(2, 4),
					},
					{
						count: nonResolvedPeers.length,
						cursor: 2,
						items: nonResolvedPeers.slice(2, 4),
					},
					{
						count: resolvedPeers.length,
						cursor: 6,
						items: resolvedPeers.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const peer = await insertPeer(ctx, userId);
				const peerDebts = [
					await insertDebt(ctx, userId, peer.id, { currencyCode: "USD" }),
				];

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ cursor: 0, limit: 2 }),
					() =>
						caller.procedure({ cursor: 0, limit: -1 }).catch((error) => error),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: peerDebts.length,
					cursor: 0,
					items: mapPeers([{ peer }]),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
