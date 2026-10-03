import { test } from "./receipt-item.utils";

test("consumer ratio", async ({
	setupItem,
	itemPart,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await itemPart(card, 1, 2).first().scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("ratio.png", {
		locator: itemPart(card, 1, 2).first(),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
