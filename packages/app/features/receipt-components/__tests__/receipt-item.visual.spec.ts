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
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				location: [10, 5],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
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
