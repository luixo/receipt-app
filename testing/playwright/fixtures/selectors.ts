import type { Locator } from "@playwright/test";
import { test } from "@playwright/test";

type SelectorsFixtures = {
	loader: Locator;
	skeleton: Locator;
	withLoader: (locator: Locator) => Locator;
	modal: (title?: string) => Locator;
	modalCross: Locator;
	user: Locator;
	errorMessage: (message?: string | RegExp) => Locator;
	emptyCard: (message?: string | RegExp) => Locator;
	backLink: Locator;
};

export const selectorsFixtures = test.extend<SelectorsFixtures>({
	withLoader: async ({ loader }, use) => {
		await use((locator) => locator.filter({ has: loader }));
	},
	modal: async ({ page }, use) => {
		await use((title) =>
			page.locator(
				`section[role="dialog"]${title ? `[title="${title}"]` : ""}`,
			),
		);
	},
	modalCross: async ({ page }, use) => {
		await use(
			page
				.locator(`section[role="dialog"]`)
				.locator(`button[aria-label="Close"]`),
		);
	},
	errorMessage: async ({ page }, use) => {
		await use((message) => {
			const errorMessage = page.getByTestId("error-message");
			if (message) {
				return errorMessage.filter({ has: page.getByText(message) });
			}
			return errorMessage;
		});
	},
	loader: ({ page }, use) => use(page.locator('[aria-label="Loading"]')),
	skeleton: ({ page }, use) =>
		use(page.locator(".group-data-\\[loaded\\=true\\]\\:opacity-100")),
	user: ({ page }, use) => use(page.getByTestId("user")),
	emptyCard: async ({ page }, use) => {
		await use((message) => {
			const emptyCard = page.getByTestId("empty-card");
			if (message) {
				return emptyCard.filter({ has: page.getByText(message) });
			}
			return emptyCard;
		});
	},
	backLink: ({ page }, use) => use(page.getByTestId("back-link")),
});
