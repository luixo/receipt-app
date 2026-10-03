import { test } from "./receipt-item.utils";

test("default payer", async ({
	setupItem,
	itemPayers,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await itemPayers(card).scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("payer.png", {
		locator: itemPayers(card),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
