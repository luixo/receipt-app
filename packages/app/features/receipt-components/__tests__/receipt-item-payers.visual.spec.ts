import { test } from "./receipt-item.utils";

test("default payer", async ({
	mockItem,
	openReceipt,
	card,
	itemPayers,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await itemPayers.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("payer.png", {
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
		locator: itemPayers,
	});
});
