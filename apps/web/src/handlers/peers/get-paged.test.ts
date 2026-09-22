import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertPeer,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-paged";

const mapPeers = (peers: Awaited<ReturnType<typeof insertPeer>>[]) =>
	peers.toSorted((a, b) => a.name.localeCompare(b.name)).map(({ id }) => id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("peers.getPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				limit: 1,
				cursor: 0,
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: MAX_LIMIT + 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
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
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: -1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: MAX_OFFSET + 1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
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
		test("returns empty results", async ({ ctx }) => {
			const { id: otherAccountId } = await insertAccount(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);

			// Verify other peers do not interfere
			await insertPeer(ctx, otherAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ limit: 3, cursor: 0 });
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("returns results", async ({ ctx }) => {
			const { id: otherAccountId } = await insertAccount(ctx);
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verify other peers do not interfere
			await insertPeer(ctx, otherAccountId);

			const peer = await insertPeer(ctx, accountId);
			const publicNamedPeer = await insertPeer(ctx, accountId, {
				publicName: "Alice",
			});
			const firstAccount = await insertAccount(ctx);
			const [connectedPeer] = await insertConnectedPeers(ctx, [
				accountId,
				firstAccount.id,
			]);
			const secondAccount = await insertAccount(ctx, { avatarUrl: null });
			const [connectedPublicNamedPeer] = await insertConnectedPeers(ctx, [
				{ accountId, publicName: "Bob" },
				secondAccount.id,
			]);
			const extraPeer = await insertPeer(ctx, accountId, {
				name: "Z - last name in a list",
			});

			const limit = 4;
			const peers = [
				peer,
				publicNamedPeer,
				connectedPeer,
				connectedPublicNamedPeer,
				extraPeer,
			];
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ limit, cursor: 0 });
			expect(result).toStrictEqual<typeof result>({
				count: peers.length,
				cursor: 0,
				items: mapPeers(peers).slice(0, limit),
			});
		});

		test("returns paged results", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const limit = 2;
			await Promise.all(
				Array.from({ length: limit }, async (_, index) => {
					await insertPeer(ctx, accountId, { name: `Alice ${index}` });
					if (index !== 0) {
						await insertPeer(ctx, accountId, {
							name: `Alice ${index} - additional`,
						});
					}
				}),
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				limit,
				cursor: 0,
			});
			expect(firstPage.items).toHaveLength(limit);
			expect(firstPage.count).toStrictEqual(2 * limit - 1);
			expect(firstPage.cursor).toStrictEqual(0);
			const secondPage = await caller.procedure({
				cursor: firstPage.cursor + limit,
				limit,
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.count).toStrictEqual(2 * limit - 1);
			expect(secondPage.cursor).toStrictEqual(firstPage.cursor + limit);
		});

		test("same-named peers are ordered by ids", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			await insertPeer(ctx, accountId, { name: "Alice" });
			await insertPeer(ctx, accountId, { name: "Alice" });
			await insertPeer(ctx, accountId, { name: "Alice" });
			await insertPeer(ctx, accountId, { name: "Alice" });
			await insertPeer(ctx, accountId, { name: "Alice" });

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 5,
				cursor: 0,
			});
			const sortedIds = [...result.items].toSorted();
			expect(result.items).toStrictEqual(sortedIds);
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const peers = mapPeers(
					await Promise.all(
						Array.from({ length: 10 }, async (_, index) =>
							insertPeer(ctx, accountId, { name: `Alice ${index}` }),
						),
					),
				);

				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit, cursor: 0 }),
					() => caller.procedure({ limit, cursor: 2 }),
					() => caller.procedure({ limit, cursor: 6 }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: peers.length,
						cursor: 0,
						items: peers.slice(0, 2),
					},
					{
						count: peers.length,
						cursor: 2,
						items: peers.slice(2, 4),
					},
					{
						count: peers.length,
						cursor: 6,
						items: peers.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const peer = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit: 2, cursor: 0 }),
					() =>
						caller.procedure({ limit: -1, cursor: 0 }).catch((error) => error),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: 1,
					cursor: 0,
					items: mapPeers([peer]),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
