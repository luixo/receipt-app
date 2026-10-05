import { test } from "./receipt-item.utils";

test("consumer ratio", async ({
	mockItem,
	openReceipt,
	card,
	itemPart,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await itemPart(1, 2).first().scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("ratio.png", {
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
		locator: itemPart(1, 2).first(),
	});
});
