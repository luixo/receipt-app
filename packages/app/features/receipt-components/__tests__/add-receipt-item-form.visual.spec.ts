import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { emptyItems, test } from "./receipt-items.utils";

test("Pristine, validation, valid, pending and failed form", async ({
	api,
	mockReceipt,
	openReceipt,
	addItemButton,
	addItemForm,
	itemName,
	itemPrice,
	itemQuantity,
	saveItemButton,
	warningRow,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	test.setTimeout(90_000);
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	const pause = api.createPause();
	const message = "Item creation failed";
	const screenshotOptions: NonNullable<
		Parameters<typeof expectScreenshotWithSchemes>[1]
	> = {
		locator: addItemForm,
		timeout: 15_000,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: { light: "#ffffff", dark: "#18181b" }[colorMode] as `#${string}`,
				location: [8, 60],
			},
			...expectedPixels.slice(1),
		],
	};
	api.mockFirst("receiptItems.add", async () => {
		await pause.promise;
		throw new TRPCError({ code: "BAD_REQUEST", message });
	});
	await openReceipt(receipt);
	await addItemButton.click();
	await expectScreenshotWithSchemes("form-pristine.png", screenshotOptions);
	await itemName.fill("A");
	await itemName.press("Tab");
	await expectScreenshotWithSchemes("form-validation.png", screenshotOptions);
	await itemName.fill("Coffee");
	await itemPrice.fill("5");
	await itemPrice.press("Tab");
	await itemQuantity.fill("2");
	await itemQuantity.press("Tab");
	await expect(saveItemButton).toBeEnabled();
	await expectScreenshotWithSchemes("form-valid.png", screenshotOptions);
	await saveItemButton.click();
	await expect(warningRow("Coffee")).toBeChecked();
	await expectScreenshotWithSchemes("form-pending.png", screenshotOptions);
	pause.resolve();
	await awaitCacheKey("receiptItems.add", { error: 1 });
	await verifyToastTexts(`Error adding item "Coffee": ${message}`);
	await expectScreenshotWithSchemes("form-failed.png", screenshotOptions);
});
