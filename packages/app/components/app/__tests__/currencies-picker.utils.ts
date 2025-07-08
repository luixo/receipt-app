import { type Locator, expect, test as originalTest } from "@playwright/test";

import { getCurrencyDescription } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";

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
	expectCurrency: async ({}, use) => {
		await use(async (locator, currencyCode) => {
			await expect(locator).toHaveValue(
				getCurrencyDescription(localSettings.locale, currencyCode),
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
