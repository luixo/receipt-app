import { test } from "./receipt-item.utils";

test("selected consumers", async ({
	setupItem,
	itemConsumers,
	expectScreenshotWithSchemes,
}) => {
	const { card } = await setupItem();
	await itemConsumers(card).scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("consumers.png", {
		locator: itemConsumers(card),
		noStickyMenuMask: true,
		mapExpectedPixels: () => [],
	});
});
