import { TRPCError } from "@trpc/server";
import { entries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: (options?: { generateUsers?: GenerateUsers }) => Promise<{
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	openUserDebtsScreen: (
		userId: UsersId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ page, api, faker }, use) =>
		use(async ({ generateUsers = defaultGenerateUsers } = {}) => {
			await api.mockUtils.authPage({ page });
			const users = generateUsers({ faker, amount: 1 });
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const debtUser = users[0]!;
			api.mockFirst(
				"users.get",
				({ input, next }) =>
					users.find((user) => user.id === input.id) || next(),
			);
			return { debtUser };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { debtUser } = await mockBase();
			const debts = generateDebts({ faker, userId: debtUser.id });
			const aggregatedDebts = entries(
				debts.reduce<Record<CurrencyCode, number>>(
					(acc, { currencyCode, amount }) => ({
						...acc,
						[currencyCode]: (acc[currencyCode] || 0) + amount,
					}),
					{},
				),
			).map(([currencyCode, sum]) => ({ currencyCode, sum }));
			api.mockFirst("debts.getAllUser", aggregatedDebts);
			api.mockFirst("debts.getUsersPaged", {
				count: 1,
				cursor: 0,
				items: [debtUser.id],
			});
			api.mockFirst("debts.getByUserPaged", {
				cursor: 0,
				count: debts.length,
				items: debts.map(({ id }) => id),
			});
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				const matchedDebt = debts.find((debt) => debt.id === lookupId);
				if (!matchedDebt) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Expected to have debt id "${lookupId}", but none found`,
					});
				}
				return matchedDebt;
			});
			return { debts, debtUser };
		}),

	openUserDebtsScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true, awaitDebts = 0 } = {}) => {
			await page.goto(`/debts/user/${userId}/`);
			await page.pause();
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
