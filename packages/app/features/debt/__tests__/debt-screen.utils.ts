import type { Locator } from "@playwright/test";

import type { ReceiptId } from "~db/ids";

import { test as originalTest } from "./utils";

type Fixtures = {
	amountInput: Locator;
	saveAmountButton: Locator;
	dateInput: Locator;
	noteInput: Locator;
	saveNoteButton: Locator;
	removeDebtButton: Locator;
	userPreview: Locator;
	receiptLinkButton: (receiptId: ReceiptId) => Locator;
	removeDebtDialog: Locator;
	currencyTriggerButton: Locator;
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

	receiptLinkButton: ({ page }, use) =>
		use((receiptId) => page.locator(`a[href="/receipts/${receiptId}"]`)),

	removeDebtDialog: ({ modal }, use) => use(modal("Remove modal")),

	currencyTriggerButton: ({ page }, use) =>
		use(page.getByTestId("currency-trigger-button")),
});
