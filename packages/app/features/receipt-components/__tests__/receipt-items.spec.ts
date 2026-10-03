import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

import { emptyItems, test, timestampedItems } from "./receipt-items.utils";

test("An empty owned receipt keeps its empty card while opening the form", async ({
	mockReceipt,
	openReceipt,
	addItemButton,
	itemCards,
	warningSection,
	addItemForm,
	emptyCard,
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	await openReceipt(receipt);
	await expect(addItemButton).toBeVisible();
	await expect(emptyCard("You have no receipt items yet")).toContainText(
		"Press a button above to add a receipt item",
	);
	await expect(itemCards).toHaveCount(0);
	await expect(warningSection).not.toBeAttached();
	await addItemButton.click();
	await expect(addItemForm).toBeVisible();
	await expect(emptyCard("You have no receipt items yet")).toBeVisible();
});

test("A guest cannot open the add control", async ({
	mockReceipt,
	openReceipt,
	addItemButton,
	addItemForm,
}) => {
	const { receipt, peers } = await mockReceipt({
		generateReceiptItems: emptyItems,
		generateReceipt: (options) => ({
			...defaultGenerateReceipt(options),
			ownerPeerId: options.peers[0]?.id ?? options.selfPeerId,
			debts: {
				direction: "incoming",
				id: undefined,
				hasMine: false,
				hasForeign: false,
			},
		}),
	});
	assert.ok(peers[0]);
	await openReceipt(receipt);
	await expect(addItemButton).toBeDisabled();
	await expect(addItemForm).not.toBeAttached();
});

test("Cards are oldest first without changing the API item order", async ({
	mockReceipt,
	openReceipt,
	itemCards,
	warningSection,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptItems: (options) =>
			timestampedItems(defaultGenerateReceiptItems(options).slice(0, 3)),
		generateReceipt: (options) => {
			const original = options.receiptItemsWithConsumers;
			assert.ok(original[0] && original[1] && original[2]);
			return {
				...defaultGenerateReceipt(options),
				items: [original[2], original[0], original[1]],
			};
		},
	});
	const apiOrder = receipt.items.map((item) => item.name);
	await openReceipt(receipt);
	await expect(itemCards).toHaveCount(3);
	const rendered = await itemCards
		.getByRole("textbox", { name: "Receipt item name" })
		.evaluateAll((inputs) =>
			inputs.map((input) => (input as HTMLInputElement).value),
		);
	expect(rendered).toEqual(
		receipt.items
			.toSorted((a, b) =>
				Temporal.ZonedDateTime.compare(a.createdAt, b.createdAt),
			)
			.map((item) => item.name),
	);
	expect(receipt.items.map((item) => item.name)).toEqual(apiOrder);
	await expect(warningSection).not.toBeAttached();
});
