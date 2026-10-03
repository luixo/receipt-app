import { test } from "./receipt-item.utils";

test("editable name", async ({
	setupItem,
	itemName,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await expectScreenshotWithSchemes("name.png", {
		locator: itemName(card),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
