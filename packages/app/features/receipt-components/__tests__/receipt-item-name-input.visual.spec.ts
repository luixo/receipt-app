import { test } from "./receipt-item.utils";

test("editable name", async ({
	mockItem,
	openReceipt,
	card,
	itemName,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("name.png", {
		pixelsPreset: "surface",
		locator: itemName,
	});
});
