import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

type Fixtures = {
	languageSelectButton: Locator;
	limitSelectButton: Locator;
	colorModeButton: Locator;
	showResolvedDebtsSwitch: Locator;
	manualAcceptDebtsSwitch: Locator;
	manualAcceptDebtsResetButton: Locator;
	refreshButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	languageSelectButton: ({ page }, use) =>
		use(page.getByTestId("language-select")),

	limitSelectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Items per page" })),

	colorModeButton: ({ page }, use) =>
		use(page.getByTestId("color-mode-button")),

	showResolvedDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("show-resolved-debts-switch")),

	manualAcceptDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("manual-accept-debts-switch")),

	manualAcceptDebtsResetButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reset", exact: true })),

	refreshButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reset cache" })),
});
