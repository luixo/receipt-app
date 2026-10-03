import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

import { emptyItems, test, timestampedItems } from "./receipt-items.utils";

test("Empty collection", async ({
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("empty-collection.png");
});

test("Populated collection masks item card internals", async ({
	mockReceipt,
	openReceipt,
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
	await expect(itemCards).toHaveCount(3);
	await expectScreenshotWithSchemes("populated-collection.png", {
		mask: [itemCards],
	});
});
