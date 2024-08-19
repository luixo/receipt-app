import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	debtsGroup: Locator;
	debtsGroupElement: Locator;
};

export const test = originalTest.extend<Fixtures>({
	debtsGroup: ({ page }, use) => use(page.getByTestId("debts-group")),
	debtsGroupElement: ({ page }, use) =>
		use(page.getByTestId("debts-group-element")),
});
