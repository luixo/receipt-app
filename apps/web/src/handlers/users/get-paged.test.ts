import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-paged";

const mapUsers = (users: Awaited<ReturnType<typeof insertUser>>[]) =>
	users.sort((a, b) => a.name.localeCompare(b.name)).map(({ id }) => id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.getPaged", () => {
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
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: MAX_LIMIT + 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
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
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: -1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: MAX_OFFSET + 1, limit: 1 }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
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

			// Verify other users do not interfere
			await insertUser(ctx, otherAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
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

			// Verify other users do not interfere
			await insertUser(ctx, otherAccountId);

			const user = await insertUser(ctx, accountId);
			const publicNamedUser = await insertUser(ctx, accountId, {
				publicName: "Alice",
			});
			const firstAccount = await insertAccount(ctx);
			const [connectedUser] = await insertConnectedUsers(ctx, [
				accountId,
				firstAccount.id,
			]);
			const secondAccount = await insertAccount(ctx, { avatarUrl: null });
			const [connectedPublicNamedUser] = await insertConnectedUsers(ctx, [
				{ accountId, publicName: "Bob" },
				secondAccount.id,
			]);
			const extraUser = await insertUser(ctx, accountId, {
				name: "Z - last name in a list",
			});

			const limit = 4;
			const users = [
				user,
				publicNamedUser,
				connectedUser,
				connectedPublicNamedUser,
				extraUser,
			];
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ limit, cursor: 0 });
			expect(result).toStrictEqual<typeof result>({
				count: users.length,
				cursor: 0,
				items: mapUsers(users).slice(0, limit),
			});
		});

		test("returns paged results", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const limit = 2;
			await Promise.all(
				Array.from({ length: limit }, async (_, index) => {
					await insertUser(ctx, accountId, { name: `Alice ${index}` });
					if (index !== 0) {
						await insertUser(ctx, accountId, {
							name: `Alice ${index} - additional`,
						});
					}
				}),
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				limit,
				cursor: 0,
			});
			expect(firstPage.items.length).toBe(limit);
			expect(firstPage.count).toBe(2 * limit - 1);
			expect(firstPage.cursor).toBe(0);
			const secondPage = await caller.procedure({
				cursor: firstPage.cursor + limit,
				limit,
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.count).toBe(2 * limit - 1);
			expect(secondPage.cursor).toBe(firstPage.cursor + limit);
		});

		test("same-named users are ordered by ids", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			await insertUser(ctx, accountId, { name: "Alice" });
			await insertUser(ctx, accountId, { name: "Alice" });
			await insertUser(ctx, accountId, { name: "Alice" });
			await insertUser(ctx, accountId, { name: "Alice" });
			await insertUser(ctx, accountId, { name: "Alice" });

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 5,
				cursor: 0,
			});
			const sortedIds = [...result.items].sort();
			expect(result.items).toStrictEqual(sortedIds);
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const users = mapUsers(
					await Promise.all(
						Array.from({ length: 10 }, async (_, index) =>
							insertUser(ctx, accountId, { name: `Alice ${index}` }),
						),
					),
				);

				const limit = 2;
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit, cursor: 0 }),
					() => caller.procedure({ limit, cursor: 2 }),
					() => caller.procedure({ limit, cursor: 6 }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: users.length,
						cursor: 0,
						items: users.slice(0, 2),
					},
					{
						count: users.length,
						cursor: 2,
						items: users.slice(2, 4),
					},
					{
						count: users.length,
						cursor: 6,
						items: users.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const user = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit: 2, cursor: 0 }),
					() => caller.procedure({ limit: -1, cursor: 0 }).catch((e) => e),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: 1,
					cursor: 0,
					items: mapUsers([user]),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
