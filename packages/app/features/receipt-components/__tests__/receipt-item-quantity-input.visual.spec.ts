import { test } from "./receipt-item.utils";

test("editable quantity", async ({
	mockItem,
	openReceipt,
	card,
	itemQuantityField,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("quantity.png", {
		pixelsPreset: "input",
		locator: itemQuantityField,
	});
});
