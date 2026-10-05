import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { emptyItems, test } from "./receipt-items.utils";

test("Invalid values", async ({
	mockReceipt,
	openReceipt,
	addItemButton,
	itemName,
	itemPrice,
	itemQuantity,
	saveItemButton,
	faker,
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	await openReceipt(receipt);
	await addItemButton.click();
	await expect(itemName).toBeFocused();
	await expect(itemName).toHaveValue("");
	await expect(itemPrice).toHaveValue("");
	await expect(itemQuantity).toHaveValue("1");
	await expect(saveItemButton).toBeDisabled();
	await itemName.fill(faker.string.alpha(1));
	const validName = faker.commerce.productName();
	const validPrice = faker.number.int({ min: 1, max: 100 });
	await itemPrice.fill(String(validPrice));
	await itemPrice.press("Tab");
	await expect(saveItemButton).toBeDisabled();
	await itemName.fill(validName);
	for (const [field, value] of [
		[itemPrice, "0"],
		[itemPrice, "9999999999999999"],
		[itemQuantity, "0"],
		[itemQuantity, "1000000001"],
	] as const) {
		await field.fill(value);
		await field.press("Tab");
		await expect(
			saveItemButton,
			`Invalid ${value} should disable Save`,
		).toBeDisabled();
		await itemPrice.fill(String(validPrice));
		await itemPrice.press("Tab");
		await itemQuantity.fill("1");
		await itemQuantity.press("Tab");
		await expect(saveItemButton).toBeEnabled();
	}
	await itemPrice.fill("1.234");
	await itemPrice.press("Tab");
	await expect(itemPrice).toHaveValue("1.23");
	await itemQuantity.fill("1.234");
	await itemQuantity.press("Tab");
	await expect(itemQuantity).toHaveValue("1.23");
	await itemPrice.fill("-3");
	await itemPrice.press("Tab");
	// React Aria rejects a typed negative value and restores the last valid price.
	await expect(itemPrice).toHaveValue("1.23");
	await expect(saveItemButton).toBeEnabled();
});

test.describe(`"receiptItems.add" mutation`, () => {
	test("success", async ({
		api,
		mockReceipt,
		openReceipt,
		addItemButton,
		itemName,
		itemPrice,
		itemQuantity,
		saveItemButton,
		itemCards,
		warningRow,
		emptyCard,
		awaitCacheKey,
		snapshotQueries,
		faker,
	}) => {
		const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
		const pause = api.createPause();
		const receiptItemId = faker.string.uuid();
		const createdAt = Temporal.Now.zonedDateTimeISO().subtract({ days: 2 });
		const name = faker.commerce.productName();
		const price = faker.number.float({ min: 1, max: 100, multipleOf: 0.01 });
		const quantity = faker.number.int({ min: 2, max: 10 });
		api.mockFirst("receiptItems.add", async () => {
			await pause.promise;
			return { id: receiptItemId, createdAt };
		});
		await openReceipt(receipt);
		await addItemButton.click();
		await itemName.fill(name);
		await itemPrice.fill(String(price));
		await itemPrice.press("Tab");
		await itemQuantity.fill(String(quantity));
		await itemQuantity.press("Tab");
		await expect(saveItemButton).toBeEnabled();
		await snapshotQueries(
			async () => {
				await saveItemButton.click();
				await expect(saveItemButton).toBeDisabled();
				await expect(itemPrice).toBeDisabled();
				await expect(itemQuantity).toBeDisabled();
				await expect(itemCards).toHaveCount(1);
				await expect(warningRow(name)).toBeChecked();
				await expect(
					emptyCard("You have no receipt items yet"),
				).not.toBeAttached();
			},
			{ name: "pending", blacklistKeys: ["peers.get"] },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItems.add");
				await expect(itemName).toHaveValue("");
				await expect(itemName).toBeFocused();
			},
			{ name: "success" },
		);
		await expect(itemPrice).toHaveValue("0");
		await expect(itemQuantity).toHaveValue("1");
		await expect(itemCards).toHaveCount(1);
		await expect(warningRow(name)).toBeChecked();
	});

	test("loading and error", async ({
		api,
		mockReceipt,
		openReceipt,
		addItemButton,
		itemName,
		itemPrice,
		itemQuantity,
		saveItemButton,
		itemCards,
		warningRow,
		emptyCard,
		awaitCacheKey,
		verifyToastTexts,
		snapshotQueries,
		faker,
	}) => {
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
		await itemName.fill(name);
		await itemPrice.fill(String(price));
		await itemPrice.press("Tab");
		await itemQuantity.fill(String(quantity));
		await itemQuantity.press("Tab");
		await snapshotQueries(
			async () => {
				await saveItemButton.click();
				await expect(saveItemButton).toBeDisabled();
				await expect(itemCards).toHaveCount(1);
				await expect(warningRow(name)).toBeChecked();
			},
			{ name: "pending", blacklistKeys: ["peers.get"] },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItems.add", { error: 1 });
				await verifyToastTexts(
					`Error adding item "${name}": ${mockErrorMessage}`,
				);
				await expect(itemCards).toHaveCount(0);
				await expect(warningRow(name)).not.toBeAttached();
			},
			{ name: "error" },
		);
		await expect(emptyCard("You have no receipt items yet")).toBeVisible();
		await expect(itemName).toHaveValue(name);
		await expect(itemPrice).toHaveValue(String(price));
		await expect(itemQuantity).toHaveValue(String(quantity));
		await expect(saveItemButton).toBeEnabled();
	});
});
