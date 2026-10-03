import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { getMutationsByKey } from "~tests/frontend/utils/queries";

import { emptyItems, test } from "./receipt-items.utils";

test("Pristine and invalid values cannot be submitted", async ({
	mockReceipt,
	openReceipt,
	addItemButton,
	itemName,
	itemPrice,
	itemQuantity,
	saveItemButton,
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	await openReceipt(receipt);
	await addItemButton.click();
	await expect(itemName).toBeFocused();
	await expect(itemName).toHaveValue("");
	await expect(itemPrice).toHaveValue("");
	await expect(itemQuantity).toHaveValue("1");
	await expect(saveItemButton).toBeDisabled();
	await itemName.fill("A");
	await itemPrice.fill("10");
	await itemPrice.press("Tab");
	await expect(saveItemButton).toBeDisabled();
	await itemName.fill("Coffee");
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
		await itemPrice.fill("10");
		await itemPrice.press("Tab");
		await itemQuantity.fill("1");
		await itemQuantity.press("Tab");
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

test("Adding an item updates the cache optimistically, then uses the server id and resets the form", async ({
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
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	const pause = api.createPause();
	const id = "server-item-id";
	const createdAt = Temporal.Now.zonedDateTimeISO().subtract({ days: 2 });
	api.mockFirst("receiptItems.add", async () => {
		await pause.promise;
		return { id, createdAt };
	});
	await openReceipt(receipt);
	await addItemButton.click();
	await itemName.fill("Coffee");
	await itemPrice.fill("12.50");
	await itemPrice.press("Tab");
	await itemQuantity.fill("2");
	await itemQuantity.press("Tab");
	await expect(saveItemButton).toBeEnabled();
	const { nextQueryCache: pending } = await snapshotQueries(
		async () => {
			await saveItemButton.click();
			await expect(saveItemButton).toBeDisabled();
			await expect(itemPrice).toBeDisabled();
			await expect(itemQuantity).toBeDisabled();
			await expect(itemCards).toHaveCount(1);
			await expect(warningRow("Coffee")).toBeChecked();
			await expect(
				emptyCard("You have no receipt items yet"),
			).not.toBeAttached();
		},
		{ name: "pending", skipCache: true, blacklistKeys: ["peers.get"] },
	);
	expect(JSON.stringify(pending)).toContain('"temp-');
	expect(
		getMutationsByKey(pending, "receiptItems.add")[0]?.state.variables,
	).toEqual({
		receiptId: receipt.id,
		name: "Coffee",
		price: 12.5,
		quantity: 2,
	});
	const { nextQueryCache: success } = await snapshotQueries(
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
	await expect(warningRow("Coffee")).toBeChecked();
	expect(JSON.stringify(success)).toContain(id);
});

test("A failed add rolls back the card and warning, retaining values for retry", async ({
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
}) => {
	const { receipt } = await mockReceipt({ generateReceiptItems: emptyItems });
	const pause = api.createPause();
	const message = "Item creation failed";
	api.mockFirst("receiptItems.add", async () => {
		await pause.promise;
		throw new TRPCError({ code: "BAD_REQUEST", message });
	});
	await openReceipt(receipt);
	await addItemButton.click();
	await itemName.fill("Coffee");
	await itemPrice.fill("5");
	await itemPrice.press("Tab");
	await itemQuantity.fill("2");
	await itemQuantity.press("Tab");
	await saveItemButton.click();
	await expect(warningRow("Coffee")).toBeChecked();
	await snapshotQueries(
		async () => {
			pause.resolve();
			await awaitCacheKey("receiptItems.add", { error: 1 });
			await verifyToastTexts(`Error adding item "Coffee": ${message}`);
			await expect(itemCards).toHaveCount(0);
			await expect(warningRow("Coffee")).not.toBeAttached();
		},
		{ name: "error" },
	);
	await expect(emptyCard("You have no receipt items yet")).toBeVisible();
	await expect(itemName).toHaveValue("Coffee");
	await expect(itemPrice).toHaveValue("5");
	await expect(itemQuantity).toHaveValue("2");
	await expect(saveItemButton).toBeEnabled();
});
