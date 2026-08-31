import type { Locator } from "@playwright/test";

import type { CurrencyCode } from "~app/utils/currency";
import { getCurrencySymbol } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";

import { test as originalTest } from "./utils";

type Fixtures = {
	amountInput: Locator;
	saveAmountButton: Locator;
	dateInput: Locator;
	noteInput: Locator;
	saveNoteButton: Locator;
	removeDebtButton: Locator;
	userPreview: Locator;
	currencyTriggerButton: (currencyCode: CurrencyCode) => Locator;
};

export const test = originalTest.extend<Fixtures>({
	amountInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Debt amount" })),

	saveAmountButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save debt amount" })),

	dateInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Date" })),

	noteInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Debt note" })),

	saveNoteButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save debt note" })),

	removeDebtButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove debt" })),

	userPreview: ({ page }, use) => use(page.getByTestId("user")),

	// The trigger button only shows the currency symbol as its content
	// (e.g. "$"), unlike the picker's own currency buttons which carry a
	// `data-testid` and `title` attribute.
	currencyTriggerButton: ({ page }, use) =>
		use((currencyCode) =>
			page.getByRole("button", {
				name: getCurrencySymbol(localSettings.locale, currencyCode),
				exact: true,
			}),
		),
});
