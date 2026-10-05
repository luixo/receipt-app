import type { Locator } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateReceiptItemsWithConsumers } from "~tests/frontend/generators/receipts";

import {
	getItemCards,
	getItemNameInput,
	getItemPriceInput,
	getItemQuantityInput,
} from "./receipt-item.utils";

export const emptyItems = () => [];

export const unconsumedItems: GenerateReceiptItemsWithConsumers = (options) =>
	defaultGenerateReceiptItemsWithConsumers(options).map((item) => ({
		...item,
		consumers: [],
	}));

export const timestampedItems = (items: ReturnType<GenerateReceiptItems>) =>
	items.map((item, index) => ({
		...item,
		createdAt: Temporal.Now.zonedDateTimeISO().subtract({
			days: items.length - index + 1,
		}),
	}));

type Fixtures = {
	addItemButton: Locator;
	itemsCollection: Locator;
	itemCards: Locator;
	itemCardNames: Locator;
	warningSection: Locator;
	warningRows: Locator;
	warningRow: (name: string) => Locator;
	addItemForm: Locator;
	itemName: Locator;
	itemPrice: Locator;
	itemQuantity: Locator;
	saveItemButton: Locator;
};

export const test = receiptTest.extend<Fixtures>({
	addItemButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Item", exact: true })),
	itemsCollection: ({ page }, use) => use(page.getByTestId("receipt-items")),
	itemCards: ({ page }, use) => use(getItemCards(page)),
	itemCardNames: ({ itemCards }, use) => use(getItemNameInput(itemCards)),
	warningSection: ({ page }, use) =>
		use(page.getByTestId("receipt-empty-items")),
	warningRows: ({ warningSection }, use) =>
		use(warningSection.getByRole("checkbox")),
	warningRow: ({ warningSection }, use) =>
		use((name) =>
			warningSection.getByRole("checkbox", { name: new RegExp(name) }),
		),
	addItemForm: ({ page }, use) =>
		use(page.getByRole("form", { name: "Add receipt item" })),
	itemName: ({ addItemForm }, use) => use(getItemNameInput(addItemForm)),
	itemPrice: ({ addItemForm }, use) => use(getItemPriceInput(addItemForm)),
	itemQuantity: ({ addItemForm }, use) =>
		use(getItemQuantityInput(addItemForm)),
	saveItemButton: ({ addItemForm }, use) =>
		use(addItemForm.getByRole("button", { name: /Save/ })),
});
