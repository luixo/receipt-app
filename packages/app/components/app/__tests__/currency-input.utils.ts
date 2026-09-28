import { test as originalTest } from "@playwright/test";
import type { Locator } from "@playwright/test";

export type Fixtures = {
	currencyInput: Locator;
	pickCurrencyButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	currencyInput: ({ page }, use) => use(page.getByTestId("currency-input")),
	pickCurrencyButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Pick currency" })),
});
