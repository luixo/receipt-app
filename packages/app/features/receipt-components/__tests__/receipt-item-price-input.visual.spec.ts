import { test } from "./receipt-item.utils";

test("editable price", async ({
	setupItem,
	itemPriceField,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await expectScreenshotWithSchemes("price.png", {
		locator: itemPriceField(card),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
