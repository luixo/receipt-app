import type { Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import { entries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { UserId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import {
	type GenerateDebts,
	defaultGenerateDebts,
} from "~tests/frontend/generators/debts";
import {
	type GenerateUsers,
	defaultGenerateUsers,
} from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => Promise<{
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	openUserDebts: (
		userId: UserId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
	debtAmount: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ page, api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage({ page });
			const [user] = defaultGenerateUsers({ faker, amount: 1 });
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const debtUser = user!;
			api.mockUtils.mockUsers(debtUser);
			return { debtUser };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { debtUser } = await mockBase();
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: debtUser.id,
			});
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
			api.mockFirst("debts.getByUserPaged", {
				items: debts.map(({ id }) => id),
				count: debts.length,
				cursor: 0,
			});
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				const matchedDebt = debts.find((debt) => debt.id === lookupId);
				if (!matchedDebt) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Expected to have debt id "${lookupId}", but none found`,
					});
				}
				return { ...matchedDebt, userId: debtUser.id };
			});
			return { debts, debtUser };
		}),

	openUserDebts: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true, awaitDebts } = {}) => {
			await page.goto(`/debts/user/${userId}/`);
			if (awaitCache) {
				await awaitCacheKey("users.get");
				await awaitCacheKey("debts.getAllUser");
				await awaitCacheKey("debts.getByUserPaged");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),
	debtAmount: ({ page }, use) => use(page.getByTestId("preview-debt-amount")),
});
