import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	acceptIntentionButton: Locator;
	acceptIntentionDialog: Locator;
	acceptIntentionDialogYesButton: Locator;
	acceptIntentionDialogNoButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	acceptIntentionButton: ({ page }, use) =>
		use(page.getByTestId("sync-button")),
	acceptIntentionDialog: ({ page }, use) =>
		use(
			page
				.getByRole("dialog")
				.and(
					page.locator("section", {
						hasText: "Update debt to a counterparty's version",
					}),
				),
		),
	acceptIntentionDialogYesButton: ({ acceptIntentionDialog }, use) =>
		use(acceptIntentionDialog.getByRole("button", { name: "Yes" })),
	acceptIntentionDialogNoButton: ({ acceptIntentionDialog }, use) =>
		use(acceptIntentionDialog.getByRole("button", { name: "No" })),
});
