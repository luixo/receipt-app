import { test } from "./receipt-item.utils";

test("selected consumers", async ({
	mockItem,
	openReceipt,
	card,
	itemConsumers,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await itemConsumers.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("consumers.png", {
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
		locator: itemConsumers,
	});
});
