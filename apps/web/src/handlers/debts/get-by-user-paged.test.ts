import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { assert, describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import type { AccountsId, UsersId } from "~db/models";
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
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { CURRENCY_CODES } from "~utils/currency-data";
import { compare } from "~utils/date";
import { getRandomAmount } from "~web/handlers/debts/utils.test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-by-user-paged";

const mapDebts = (debts: Awaited<ReturnType<typeof insertDebt>>[]) =>
	debts
		.sort((a, b) => {
			const timestampSort = compare.plainDate(a.timestamp, b.timestamp);
			if (timestampSort !== 0) {
				return timestampSort;
			}
			return a.id.localeCompare(b.id);
		})
		.map((debt) => debt.id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getByUserPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				userId: faker.string.uuid(),
				cursor: 0,
				limit: 1,
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							cursor: 0,
							limit: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							cursor: 0,
							limit: MAX_LIMIT + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
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
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							cursor: -1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							cursor: MAX_OFFSET + 1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							cursor: faker.number.float(),
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Invalid input: expected int, received number`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: "not-a-valid-uuid",
							cursor: 0,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const fakerUserId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ userId: fakerUserId, cursor: 0, limit: 1 }),
				"NOT_FOUND",
				`User "${fakerUserId}" does not exist.`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ userId: foreignUserId, cursor: 0, limit: 1 }),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId, cursor: 0, limit: 1 });
			expect(result).toStrictEqual<typeof result>({
				items: [],
				count: 0,
				cursor: 0,
			});
		});

		test("user debts", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const syncedDebts = await Promise.all([
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
				),
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
				),
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
					{
						ahead: "their",
						fn: (originalDebt) => ({
							...originalDebt,
							amount: originalDebt.amount + 1,
						}),
					},
				),
			]);
			const userDebts = await Promise.all([
				insertDebt(ctx, accountId, userId),
				insertDebt(ctx, accountId, userId),
			]);

			// Verify other users and accounts don't affect the result
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, anotherUserId);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const debts = mapDebts([
				...userDebts,
				...syncedDebts.map(([ours]) => ours),
			]);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				items: debts,
				count: debts.length,
				cursor: 0,
			});
		});

		const insertDebts = async (
			ctx: TestContext,
			accountId: AccountsId,
			userId: UsersId,
		) => {
			// Create debts with non-zero sum currencies
			const nonResolvedDebts = await Promise.all([
				insertDebt(ctx, accountId, userId, {
					currencyCode: "USD",
					amount: 100,
				}),
				insertDebt(ctx, accountId, userId, { currencyCode: "USD", amount: 50 }),
				insertDebt(ctx, accountId, userId, { currencyCode: "EUR", amount: 25 }),
			]);

			// Create debts that resolve to zero (should be excluded by default)
			const resolvedAmount = getRandomAmount();
			const resolvedDebts = await Promise.all([
				insertDebt(ctx, accountId, userId, {
					currencyCode: "GEL",
					amount: resolvedAmount,
				}),
				insertDebt(ctx, accountId, userId, {
					currencyCode: "GEL",
					amount: -resolvedAmount,
				}),
			]);
			return [nonResolvedDebts, resolvedDebts] as const;
		};

		test("without resolved currencies", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			const [nonResolvedDebts] = await insertDebts(ctx, accountId, userId);
			// Verify other users don't affect the result
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, anotherUserId, { currencyCode: "GEL" });

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				count: nonResolvedDebts.length,
				cursor: 0,
				items: mapDebts(nonResolvedDebts),
			});
		});

		test("with resolved currencies", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			const [nonResolvedDebts, resolvedDebts] = await insertDebts(
				ctx,
				accountId,
				userId,
			);

			const allDebts = [...nonResolvedDebts, ...resolvedDebts];

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				userId,
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			await Promise.all(
				new Array(5).fill(null).map(async (_, index) => {
					const currencyCode = CURRENCY_CODES[index];
					const amount = getRandomAmount();
					await insertDebt(ctx, accountId, userId, {
						currencyCode,
						amount,
					});
					await insertDebt(ctx, accountId, userId, {
						currencyCode,
						amount: -amount,
					});
				}),
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId, cursor: 0, limit: 100 });
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("paged result", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const userDebts = await Promise.all(
				new Array(5)
					.fill(null)
					.map(() =>
						insertDebt(ctx, accountId, userId, { currencyCode: "USD" }),
					),
			);

			const limit = 3;
			const cursor = 1;
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				userId,
				cursor,
				limit,
			});
			expect(result).toStrictEqual<typeof result>({
				count: userDebts.length,
				cursor,
				items: mapDebts(userDebts).slice(1, limit + 1),
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: userId } = await insertUser(ctx, accountId);
				const { id: anotherUserId } = await insertUser(ctx, accountId);
				const userDebts = await Promise.all(
					new Array(12).fill(null).map((_, index) =>
						insertDebt(ctx, accountId, userId, {
							currencyCode: index <= 1 ? "EUR" : "USD",
							amount: index === 0 ? 100 : index === 1 ? -100 : undefined,
						}),
					),
				);
				const nonResolvedUserDebts = mapDebts(userDebts);
				const resolvedUserDebts = mapDebts(
					userDebts.filter((debt) => debt.currencyCode !== "EUR"),
				);
				const anotherUserDebts = mapDebts(
					await Promise.all(
						new Array(4).fill(null).map(() =>
							insertDebt(ctx, accountId, anotherUserId, {
								currencyCode: "EUR",
							}),
						),
					),
				);
				assert(
					nonResolvedUserDebts.length !== resolvedUserDebts.length,
					"Resolved and non-resolved debts has to be different for test to make sense",
				);

				const limit = 2;
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ userId, cursor: 0, limit }),
					() => caller.procedure({ userId, cursor: 2, limit }),
					() =>
						caller.procedure({
							userId,
							cursor: 2,
							limit,
							filters: { showResolved: true },
						}),
					() => caller.procedure({ userId, cursor: 6, limit }),
					() => caller.procedure({ userId: anotherUserId, cursor: 2, limit }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: resolvedUserDebts.length,
						cursor: 0,
						items: resolvedUserDebts.slice(0, 2),
					},
					{
						count: resolvedUserDebts.length,
						cursor: 2,
						items: resolvedUserDebts.slice(2, 4),
					},
					{
						count: nonResolvedUserDebts.length,
						cursor: 2,
						items: nonResolvedUserDebts.slice(2, 4),
					},
					{
						count: resolvedUserDebts.length,
						cursor: 6,
						items: resolvedUserDebts.slice(6, 8),
					},
					{
						count: anotherUserDebts.length,
						cursor: 2,
						items: anotherUserDebts.slice(2, 4),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: userId } = await insertUser(ctx, accountId);
				const debts = mapDebts(
					await Promise.all(
						new Array(4)
							.fill(null)
							.map(() =>
								insertDebt(ctx, accountId, userId, { currencyCode: "USD" }),
							),
					),
				);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ userId, cursor: 0, limit: 2 }),
					() =>
						caller
							.procedure({ userId: faker.string.uuid(), cursor: 2, limit: 2 })
							.catch((e) => e),
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
