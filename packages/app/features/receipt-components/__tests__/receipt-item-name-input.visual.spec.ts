import { test } from "./receipt-item.utils";

test("editable name", async ({
	mockItem,
	openReceipt,
	card,
	itemName,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = await mockItem();
	await openReceipt(receipt);
	await card.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("name.png", {
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#f4f4f5" : "#27272a",
			},
			...expectedPixels.slice(1),
		],
		locator: itemName,
	});
});
