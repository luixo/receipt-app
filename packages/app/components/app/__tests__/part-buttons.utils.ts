import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	partButtons: Locator;
	partButtonsDown: Locator;
	partButtonsUp: Locator;
};

export const test = originalTest.extend<Fixtures>({
	partButtons: ({ page }, use) => use(page.getByTestId("part-buttons").first()),
	partButtonsDown: ({ partButtons }, use) =>
		use(partButtons.getByTestId("part-buttons-down")),
	partButtonsUp: ({ partButtons }, use) =>
		use(partButtons.getByTestId("part-buttons-up")),
});
