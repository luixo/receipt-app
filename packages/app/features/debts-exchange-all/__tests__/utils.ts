import type { Locator } from "@playwright/test";
import assert from "node:assert";
import { entries, fromEntries } from "remeda";

import { getCurrencySymbol } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import type { GenerateUsers } from "~tests/frontend/generators/users";

type AggregatedDebt = { currencyCode: CurrencyCode; sum: number };

export const getPlannedDebtsAmount = (
	debts: AggregatedDebt[],
	fromCurrencyCode: CurrencyCode,
) =>
	new Set([
		...debts.filter((debt) => debt.sum !== 0).map((debt) => debt.currencyCode),
		fromCurrencyCode,
	]).size;

type Fixtures = {
	mockBase: () => Promise<{
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: AggregatedDebt[];
		debtUser: ReturnType<GenerateUsers>[number];
		rates: Record<CurrencyCode, number>;
	}>;
	currencyGroupButton: Locator;
	currencyGroupButtonByCode: (currencyCode: CurrencyCode) => Locator;
	sendButton: Locator;
	rateInput: (currencyCode: CurrencyCode) => Locator;
	rateField: (currencyCode: CurrencyCode) => Locator;
	currenciesGroup: Locator;
	currenciesGroupSkeleton: Locator;
	plannedDebtsForm: Locator;
	plannedDebtsFormSkeleton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage();
			const [debtUser] = defaultGenerateUsers({ faker, amount: 1 });
			assert.ok(debtUser);
			api.mockUtils.mockUsers(debtUser);
			return { debtUser };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts } = {}) => {
			const { debtUser } = await mockBase();
			const debts = entries(
				(generateDebts ?? defaultGenerateDebts)({
					faker,
					amount: { min: 3, max: 6 },
					userId: debtUser.id,
				}).reduce<Record<CurrencyCode, number>>(
					(acc, { currencyCode, amount }) => ({
						...acc,
						[currencyCode]: (acc[currencyCode] || 0) + amount,
					}),
					{},
				),
			).map(([currencyCode, sum]) => ({ currencyCode, sum }));
			api.mockFirst("debts.getAllUser", { items: debts });
			const rates = fromEntries(
				debts.map(
					({ currencyCode }) =>
						[
							currencyCode,
							faker.number.float({
								min: 0.01,
								max: 999.99,
								multipleOf: 0.01,
							}),
						] as const,
				),
			) as Record<CurrencyCode, number>;
			api.mockFirst("currency.rates", ({ input }) =>
				fromEntries(
					input.to.map((currencyCode) => {
						// oxlint-disable-next-line typescript/no-unnecessary-template-expression
						const rate = rates[currencyCode as `${CurrencyCode}`];
						assert.ok(rate, `Missing mocked rate for ${currencyCode}`);
						return [currencyCode, rate] as const;
					}),
				),
			);
			return { debts, debtUser, rates };
		}),

	currencyGroupButton: ({ currenciesGroup }, use) =>
		use(currenciesGroup.getByTestId("currency-button")),
	currencyGroupButtonByCode: ({ currencyGroupButton }, use) =>
		use((currencyCode) =>
			currencyGroupButton.filter({
				hasText: getCurrencySymbol(localSettings.locale, currencyCode),
			}),
		),
	sendButton: ({ plannedDebtsForm }, use) =>
		use(plannedDebtsForm.locator('button[type="submit"]')),
	rateInput: ({ page }, use) =>
		use((currencyCode) => page.getByRole("textbox", { name: currencyCode })),
	rateField: ({ rateInput, page }, use) =>
		use((currencyCode) =>
			page
				.getByTestId("planned-debt-row")
				.filter({ has: rateInput(currencyCode) }),
		),
	currenciesGroup: ({ page }, use) => use(page.getByTestId("currencies-group")),
	currenciesGroupSkeleton: ({ page }, use) =>
		use(page.getByTestId("currencies-group-skeleton")),
	plannedDebtsForm: ({ page }, use) =>
		use(page.getByTestId("planned-debts-form")),
	plannedDebtsFormSkeleton: ({ page }, use) =>
		use(page.getByTestId("planned-debts-form-skeleton")),
});
