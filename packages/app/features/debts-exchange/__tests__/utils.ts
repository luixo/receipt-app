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
	openDebtsExchangeScreen: (
		userId: UserId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	exchangeAllToOneButton: Locator;
	exchangeSpecificButton: Locator;
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

	openDebtsExchangeScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true } = {}) => {
			await page.goto(`/debts/user/${userId}/exchange/`);
			if (awaitCache) {
				await awaitCacheKey("users.get");
				await awaitCacheKey("debts.getAllUser");
			}
		}),

	exchangeAllToOneButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange all to one currency']")),
	exchangeSpecificButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange specific currency']")),
});
