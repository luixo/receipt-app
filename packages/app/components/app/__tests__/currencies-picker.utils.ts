import { type Locator, expect, test as originalTest } from "@playwright/test";

import type { CurrencyCode } from "~app/utils/currency";
import { getCurrency } from "~utils/currency-data";

export type Fixtures = {
	currencyButton: (currencyCode?: string) => Locator;
	currenciesPicker: Locator;
	expectCurrency: (
		locator: Locator,
		currencyCode: CurrencyCode,
	) => Promise<void>;
	fillCurrency: (locator: Locator, currencyCode: CurrencyCode) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	currencyButton: ({ page }, use) =>
		use((currencyCode) => {
			const testIdLocator = "[data-testid='currency-button']";
			const locator = currencyCode
				? `${testIdLocator}[title="${currencyCode}"]`
				: testIdLocator;
			return page.locator(locator);
		}),
	currenciesPicker: ({ page }, use) =>
		use(page.getByTestId("currencies-picker")),
	// eslint-disable-next-line no-empty-pattern
	expectCurrency: async ({}, use) => {
		await use(async (locator, currencyCode) => {
			const currency = getCurrency(currencyCode);
			await expect(locator).toHaveValue(
				`${currency.name_plural} (${currency.code})`,
			);
		});
	},
	fillCurrency: async (
		{ expectCurrency, currencyButton, currenciesPicker },
		use,
	) => {
		await use(async (locator, currencyCode) => {
			await locator.click();
			await expect(currenciesPicker).toBeVisible();
			await currencyButton(currencyCode).click();
			await expectCurrency(locator, currencyCode);
		});
	},
});
