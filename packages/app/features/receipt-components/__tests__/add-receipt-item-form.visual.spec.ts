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
	faker,
}) => {
	test.setTimeout(90_000);
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	const pause = api.createPause();
	const mockErrorMessage = `Mock "receiptItems.add" error`;
	const name = faker.commerce.productName();
	const price = faker.number.float({ min: 1, max: 100, multipleOf: 0.01 });
	const quantity = faker.number.int({ min: 2, max: 10 });
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
		throw new TRPCError({ code: "BAD_REQUEST", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await addItemButton.click();
	await itemName.fill(faker.string.alpha(1));
	await itemName.press("Tab");
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("validation.png", screenshotOptions);
	await itemName.fill(name);
	await itemPrice.fill(String(price));
	await itemPrice.press("Tab");
	await itemQuantity.fill(String(quantity));
	await itemQuantity.press("Tab");
	await expect(saveItemButton).toBeEnabled();
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("valid.png", screenshotOptions);
	await saveItemButton.click();
	await expect(warningRow(name)).toBeChecked();
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("pending.png", screenshotOptions);
	pause.resolve();
	await awaitCacheKey("receiptItems.add", { error: 1 });
	await verifyToastTexts(`Error adding item "${name}": ${mockErrorMessage}`);
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("failed.png", screenshotOptions);
});
