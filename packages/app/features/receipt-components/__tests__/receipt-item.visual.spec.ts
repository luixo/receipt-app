import { test } from "./receipt-item.utils";

test("card composition", async ({
	mockItem,
	openReceipt,
	card,
	itemName,
	itemPriceField,
	itemQuantityField,
	itemPayers,
	itemConsumers,
	itemPart,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("card.png", {
		pixelsPreset: "surface",
		shift: [10, 5],
		locator: card,
		noStickyMenuMask: true,
		mask: [
			itemName,
			itemPriceField,
			itemQuantityField,
			itemPayers,
			itemConsumers,
			itemPart(1, 2),
			card.getByTestId("user-avatar"),
		],
	});
});
