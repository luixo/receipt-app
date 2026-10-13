import { test } from "./receipt-item.utils";

test("default payer", async ({
	mockItem,
	openReceipt,
	card,
	itemPayers,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await itemPayers.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("payer.png", {
		pixelsPreset: "surface",
		locator: itemPayers,
	});
});
