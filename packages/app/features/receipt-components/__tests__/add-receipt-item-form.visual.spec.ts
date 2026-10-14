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
	api.mockFirst("receiptItems.add", async () => {
		await pause.promise;
		throw new TRPCError({ code: "BAD_REQUEST", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await addItemButton.click();
	await itemName.fill(faker.string.alpha(1));
	await itemName.press("Tab");
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("validation.png", {
		locator: addItemForm,
		pixelsPreset: "surface",
		shift: [200, 100],
	});
	await itemName.fill(name);
	await itemPrice.fill(String(price));
	await itemPrice.press("Tab");
	await itemQuantity.fill(String(quantity));
	await itemQuantity.press("Tab");
	await expect(saveItemButton).toBeEnabled();
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("valid.png", {
		locator: addItemForm,
		pixelsPreset: "surface",
	});
	await saveItemButton.click();
	await expect(warningRow(name)).toBeChecked();
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("pending.png", {
		locator: addItemForm,
		pixelsPreset: "surface",
	});
	pause.resolve();
	await awaitCacheKey("receiptItems.add", { error: 1 });
	await verifyToastTexts(`Error adding item "${name}": ${mockErrorMessage}`);
	await addItemForm.scrollIntoViewIfNeeded();
	await expectScreenshotWithSchemes("failed.png", {
		locator: addItemForm,
		pixelsPreset: "surface",
		shift: [200, 100],
	});
});
