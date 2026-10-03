import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateReceiptItems } from "~tests/frontend/generators/receipts";

import { test, timestampedItems, unconsumedItems } from "./receipt-items.utils";

test("Unconsumed item warning", async ({
	mockReceipt,
	openReceipt,
	warningSection,
	warningRows,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptItems: (options) =>
			timestampedItems(defaultGenerateReceiptItems(options).slice(0, 3)),
		generateReceiptItemsWithConsumers: unconsumedItems,
	});
	await openReceipt(receipt);
	await expect(warningRows).toHaveCount(3);
	await expectScreenshotWithSchemes("unconsumed-warning.png", {
		locator: warningSection,
	});
});
