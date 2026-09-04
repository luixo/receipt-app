import type { Locator, Page } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type AuthPageResult = Awaited<
	ReturnType<
		ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
	>
>;

type Fixtures = {
	openSettings: (options?: {
		manualAcceptDebts?: boolean;
	}) => Promise<AuthPageResult>;
	html: Locator;
	languageSelectButton: Locator;
	limitSelectButton: Locator;
	colorModeAutoCheckbox: Locator;
	colorModeAutoLabel: Locator;
	colorModeSwitch: Locator;
	showResolvedDebtsSwitch: Locator;
	manualAcceptDebtsSwitch: Locator;
	manualAcceptDebtsResetButton: Locator;
	refreshButton: Locator;
};

const getSelectOption = (page: Page, name: string) =>
	page.getByRole("option", { name, exact: true });

export const test = originalTest.extend<Fixtures>({
	openSettings: ({ api, page }, use) =>
		use(async ({ manualAcceptDebts = false } = {}) => {
			const auth = await api.mockUtils.authPage({ page });
			api.mockFirst("accountSettings.get", { manualAcceptDebts });
			await page.goto("/settings");
			return auth;
		}),

	html: ({ page }, use) => use(page.locator("html")),

	// Aria-label of the select trigger is translated (differs per language),
	// so it can't be queried by accessible name across a language switch.
	languageSelectButton: ({ page }, use) =>
		use(page.locator('button[aria-haspopup="listbox"]').first()),

	limitSelectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Items per page" })),

	colorModeAutoCheckbox: ({ page }, use) =>
		use(page.getByRole("checkbox", { name: "Auto" })),

	// The checkbox's own label text visually overlaps its input hit box;
	// clicking the wrapping label toggles it without needing `force`.
	colorModeAutoLabel: ({ colorModeAutoCheckbox }, use) =>
		use(colorModeAutoCheckbox.locator("..")),

	colorModeSwitch: ({ page }, use) =>
		use(page.getByTestId("color-mode-switch")),

	showResolvedDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("show-resolved-debts-switch")),

	manualAcceptDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("manual-accept-debts-switch")),

	manualAcceptDebtsResetButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reset", exact: true })),

	refreshButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reset cache" })),
});

export { getSelectOption };
