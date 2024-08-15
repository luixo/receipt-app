import { type Locator, test } from "@playwright/test";

export type Fixtures = {
	debtsGroup: Locator;
	debtsGroupElement: Locator;
};

export const debtsGroupFixture = test.extend<Fixtures>({
	debtsGroup: ({ page }, use) => use(page.getByTestId("debts-group")),
	debtsGroupElement: ({ page }, use) =>
		use(page.getByTestId("debts-group-element")),
});
