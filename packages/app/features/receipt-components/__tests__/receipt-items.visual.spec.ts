import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

import { emptyItems, test, timestampedItems } from "./receipt-items.utils";

test("Empty collection", async ({
	mockReceipt,
	openReceipt,
	itemsCollection,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	await openReceipt(receipt);
	await itemsCollection.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("empty-collection.png", {
		locator: itemsCollection,
	});
});

test("Populated collection masks item card internals", async ({
	mockReceipt,
	openReceipt,
	itemsCollection,
	itemCards,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptItems: (options) =>
			timestampedItems(defaultGenerateReceiptItems(options).slice(0, 3)),
		generateReceipt: (options) => ({
			...defaultGenerateReceipt(options),
			items: options.receiptItemsWithConsumers.toReversed(),
		}),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("populated-collection.png", {
		locator: itemsCollection,
		mask: [itemCards],
	});
});
