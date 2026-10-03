import { test } from "./receipt-item.utils";

test("editable quantity", async ({
	setupItem,
	itemQuantityField,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await expectScreenshotWithSchemes("quantity.png", {
		locator: itemQuantityField(card),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
