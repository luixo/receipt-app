import type { Locator } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateReceiptItemsWithConsumers } from "~tests/frontend/generators/receipts";

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
	itemCards: Locator;
	itemCard: (name: string) => Locator;
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
	itemCards: ({ page }, use) =>
		use(
			page.locator("[data-slot='base']").filter({
				has: page.locator('input[aria-label="Receipt item name"]'),
			}),
		),
	itemCard: ({ itemCards, page }, use) =>
		use((name) =>
			itemCards.filter({ has: page.locator(`input[value="${name}"]`) }),
		),
	warningSection: ({ page }, use) =>
		use(page.getByText("Items with no participants").locator("..")),
	warningRows: ({ warningSection }, use) =>
		use(warningSection.getByRole("checkbox")),
	warningRow: ({ warningSection }, use) =>
		use((name) =>
			warningSection.getByRole("checkbox", { name: new RegExp(name) }),
		),
	addItemForm: ({ page }, use) =>
		use(
			page.locator("form").filter({
				has: page.getByRole("textbox", { name: "Receipt item price" }),
			}),
		),
	itemName: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Receipt item name" }).first()),
	itemPrice: ({ addItemForm }, use) =>
		use(addItemForm.getByRole("textbox", { name: "Receipt item price" })),
	itemQuantity: ({ addItemForm }, use) =>
		use(addItemForm.getByRole("textbox", { name: "Receipt item quantity" })),
	saveItemButton: ({ addItemForm }, use) =>
		use(addItemForm.locator('button[type="submit"]')),
});
