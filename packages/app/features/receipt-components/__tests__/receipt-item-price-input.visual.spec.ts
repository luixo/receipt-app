import { test } from "./receipt-item.utils";

test("editable price", async ({
	mockItem,
	openReceipt,
	card,
	itemPriceField,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("price.png", {
		pixelsPreset: "surface",
		locator: itemPriceField,
	});
});
