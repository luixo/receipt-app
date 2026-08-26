import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	signButtonGroup: Locator;
	signButtonPositive: Locator;
	signButtonNegative: Locator;
};

export const test = originalTest.extend<Fixtures>({
	signButtonGroup: ({ page }, use) =>
		use(page.getByTestId("sign-button-group")),
	signButtonPositive: ({ page }, use) =>
		use(page.getByTestId("sign-button-positive")),
	signButtonNegative: ({ page }, use) =>
		use(page.getByTestId("sign-button-negative")),
});
