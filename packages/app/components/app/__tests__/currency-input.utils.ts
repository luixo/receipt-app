import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	currencyInput: Locator;
};

export const test = originalTest.extend<Fixtures>({
	currencyInput: ({ page }, use) => use(page.locator('input[name="currency"]')),
});
