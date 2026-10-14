import { test as originalTest } from "@playwright/test";
import type { Locator } from "@playwright/test";

export type Fixtures = {
	currencyInput: Locator;
	currencyInputWrapper: Locator;
	pickCurrencyButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	currencyInput: ({ page }, use) => use(page.getByTestId("currency-input")),
	currencyInputWrapper: ({ page, currencyInput }, use) =>
		use(page.getByTestId("input-wrapper").filter({ has: currencyInput })),
	pickCurrencyButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Pick currency" })),
});
