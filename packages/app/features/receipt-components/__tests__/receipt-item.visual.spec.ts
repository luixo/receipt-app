import { test } from "./receipt-item.utils";

test("card composition", async ({
	setupItem,
	itemName,
	itemPriceField,
	itemQuantityField,
	itemPayers,
	itemConsumers,
	itemPart,
	itemPeerAvatars,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await expectScreenshotWithSchemes("card.png", {
		locator: card,
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
		mask: [
			itemName(card),
			itemPriceField(card),
			itemQuantityField(card),
			itemPayers(card),
			itemConsumers(card),
			itemPart(card, 1, 2),
			itemPeerAvatars(card),
		],
	});
});
