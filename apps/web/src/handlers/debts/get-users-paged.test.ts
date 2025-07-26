import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { assert, describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getRandomAmount } from "~web/handlers/debts/utils.test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-users-paged";

const mapUsers = (
	userDebts: {
		user: Awaited<ReturnType<typeof insertUser>>;
	}[],
) =>
	userDebts
		.map(({ user }) => user)
		.sort((userA, userB) => userA.name.localeCompare(userB.name))
		.map(({ id }) => id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getUsersPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ cursor: 0, limit: 10 }),
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
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);

			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ cursor: 0, limit: 10 });
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("without resolved users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [user, { id: foreignToSelfUserId }] = await insertConnectedUsers(
				ctx,
				[accountId, foreignAccountId],
			);
			const [syncedDebt] = await insertSyncedDebts(
				ctx,
				[accountId, user.id, { currencyCode: "USD" }],
				[foreignAccountId, foreignToSelfUserId],
			);
			const userDebts = await Promise.all([
				syncedDebt,
				insertDebt(ctx, accountId, user.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, user.id, { currencyCode: "EUR" }),
				insertDebt(ctx, foreignAccountId, foreignToSelfUserId),
			]);

			const anotherUser = await insertUser(ctx, accountId);
			const anotherUserDebts = await Promise.all([
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "EUR" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "GEL" }),
			]);

			const resolvedUser = await insertUser(ctx, accountId);
			const resolvedAmount = getRandomAmount();
			await Promise.all([
				insertDebt(ctx, accountId, resolvedUser.id, {
					currencyCode: "USD",
					amount: resolvedAmount,
				}),
				insertDebt(ctx, accountId, resolvedUser.id, {
					currencyCode: "USD",
					amount: -resolvedAmount,
				}),
			]);

			// Verify other accounts users don't affect the result
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ cursor: 0, limit: 10 });
			const users = [
				{ user, debts: userDebts },
				{ user: anotherUser, debts: anotherUserDebts },
			];
			expect(result).toStrictEqual<typeof result>({
				count: users.length,
				cursor: 0,
				items: mapUsers(users),
			});
		});

		test("with resolved users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const user = await insertUser(ctx, accountId);
			const userDebts = await Promise.all([
				insertDebt(ctx, accountId, user.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, user.id, { currencyCode: "EUR" }),
			]);

			const resolvedUser = await insertUser(ctx, accountId);
			const resolvedAmount = getRandomAmount();
			const resolvedUserDebts = await Promise.all([
				insertDebt(ctx, accountId, resolvedUser.id, {
					currencyCode: "USD",
					amount: resolvedAmount,
				}),
				insertDebt(ctx, accountId, resolvedUser.id, {
					currencyCode: "USD",
					amount: -resolvedAmount,
				}),
			]);

			// Verify other accounts users don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				cursor: 0,
				limit: 10,
				filters: { showResolved: true },
			});
			const users = [
				{ user, debts: userDebts },
				{ user: resolvedUser, debts: resolvedUserDebts },
			];
			expect(result).toStrictEqual<typeof result>({
				count: users.length,
				cursor: 0,
				items: mapUsers(users),
			});
		});

		test("paged result", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const users = await Promise.all(
				new Array(5).fill(null).map(async () => {
					const user = await insertUser(ctx, accountId);
					const debt = await insertDebt(ctx, accountId, user.id, {
						currencyCode: "USD",
					});
					return { user, debts: [debt] };
				}),
			);

			const limit = 3;
			const cursor = 1;
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				cursor,
				limit,
				filters: { showResolved: true },
			});
			expect(result).toStrictEqual<typeof result>({
				count: users.length,
				cursor,
				items: mapUsers(users).slice(1, limit + 1),
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const usersDebts = await Promise.all(
					new Array(12).fill(null).map(async (_, index) => {
						const user = await insertUser(ctx, accountId);
						const debts = [
							await insertDebt(ctx, accountId, user.id, {
								currencyCode: "USD",
							}),
						];
						if (index <= 1) {
							debts.push(
								await insertDebt(ctx, accountId, user.id, {
									currencyCode: "USD",
									// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
									amount: -debts[0]!.amount,
								}),
							);
						}
						return { user, debts };
					}),
				);
				const nonResolvedUsers = mapUsers(usersDebts);
				const resolvedUsers = mapUsers(
					usersDebts.filter(({ debts }) => debts.length === 1),
				);
				assert(
					nonResolvedUsers.length !== resolvedUsers.length,
					"Resolved and non-resolved users has to be different for test to make sense",
				);

				const limit = 2;
				const caller = createCaller(await createAuthContext(ctx, sessionId));
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
						count: resolvedUsers.length,
						cursor: 0,
						items: resolvedUsers.slice(0, 2),
					},
					{
						count: resolvedUsers.length,
						cursor: 2,
						items: resolvedUsers.slice(2, 4),
					},
					{
						count: nonResolvedUsers.length,
						cursor: 2,
						items: nonResolvedUsers.slice(2, 4),
					},
					{
						count: resolvedUsers.length,
						cursor: 6,
						items: resolvedUsers.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const user = await insertUser(ctx, accountId);
				const userDebts = [
					await insertDebt(ctx, accountId, user.id, { currencyCode: "USD" }),
				];

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ cursor: 0, limit: 2 }),
					() => caller.procedure({ cursor: 0, limit: -1 }).catch((e) => e),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: userDebts.length,
					cursor: 0,
					items: mapUsers([{ user }]),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
