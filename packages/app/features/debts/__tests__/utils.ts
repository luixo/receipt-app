import { TRPCError } from "@trpc/server";
import { entries, flat, fromEntries, mapValues, values } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { UserId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: (options?: { generateUsers?: GenerateUsers }) => Promise<{
		users: ReturnType<GenerateUsers>;
	}>;
	mockDebts: (options?: {
		generateUsers?: GenerateUsers;
		generateDebts?: GenerateDebts;
	}) => Promise<{
		debts: ReturnType<GenerateDebts>;
		users: ReturnType<GenerateUsers>;
	}>;
	openUserDebtsScreen: (
		userId: UserId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
};

const aggregateDebts = (
	debts: ReturnType<GenerateDebts>,
): { currencyCode: CurrencyCode; sum: number }[] =>
	entries(
		debts.reduce<Record<CurrencyCode, number>>(
			(acc, { currencyCode, amount }) => ({
				...acc,
				[currencyCode]: (acc[currencyCode] || 0) + amount,
			}),
			{},
		),
	).map(([currencyCode, sum]) => ({ currencyCode, sum }));

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async ({ generateUsers = defaultGenerateUsers } = {}) => {
			await api.mockUtils.authPage();
			const users = generateUsers({ faker, amount: 3 });
			api.mockUtils.mockUsers(...users);
			return { users };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(
			async ({ generateUsers, generateDebts = defaultGenerateDebts } = {}) => {
				const { users } = await mockBase({ generateUsers });
				const debtsByUsers = fromEntries(
					users.map(
						(user) =>
							[user.id, generateDebts({ faker, userId: user.id })] as const,
					),
				);
				const aggregatedDebtsByUsers = mapValues(debtsByUsers, (debts) =>
					aggregateDebts(debts),
				);
				const allDebts = flat(values(debtsByUsers));
				const aggregatedDebts = aggregateDebts(allDebts);
				api.mockFirst("debts.getAll", { items: aggregatedDebts });
				api.mockFirst("debts.getAllUser", ({ input: { userId } }) => ({
					items: aggregatedDebtsByUsers[userId] ?? [],
				}));
				api.mockFirst(
					"debts.getUsersPaged",
					({ input: { cursor, limit } }) => ({
						count: users.length,
						cursor,
						items: users.map((user) => user.id).slice(cursor, cursor + limit),
					}),
				);
				api.mockFirst(
					"debts.getByUserPaged",
					({ input: { userId, cursor, limit } }) => {
						const userDebts = debtsByUsers[userId] ?? [];
						return {
							count: userDebts.length,
							cursor,
							items: userDebts
								.map(({ id }) => id)
								.slice(cursor, cursor + limit),
						};
					},
				);
				api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
					const matchedDebt = allDebts.find((debt) => debt.id === lookupId);
					if (!matchedDebt) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: `Expected to have debt id "${lookupId}", but none found`,
						});
					}
					return matchedDebt;
				});
				return { debts: allDebts, users };
			},
		),

	openUserDebtsScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true, awaitDebts = 0 } = {}) => {
			await page.navigate({ to: "/debts/user/$id", params: { id: userId } });
			if (awaitCache) {
				await awaitCacheKey("users.get");
				await awaitCacheKey("debts.getAllUser");
				await awaitCacheKey("debts.getByUserPaged");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),
});
