import { TRPCError } from "@trpc/server";

import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("Price input", async ({
	api,
	mockItem,
	openReceipt,
	card,
	itemPrice,
	awaitCacheKey,
	snapshotQueries,
	faker,
}) => {
	api.mockFirst("receiptItems.update", () => undefined);
	const { receipt, item } = await mockItem();
	await openReceipt(receipt);
	await itemPrice.fill("0");
	await itemPrice.press("Tab");
	const nextPrice = faker.number.float({ min: 21, max: 30, fractionDigits: 2 });
	await snapshotQueries(async () => {
		await itemPrice.fill(nextPrice.toFixed(2));
		await itemPrice.press("Tab");
		await awaitCacheKey("receiptItems.update", {
			success: 1,
			input: { id: item.id, update: { type: "price", price: nextPrice } },
		});
	});
	await expect(
		card.getByText(
			formatCurrency(
				localSettings.locale,
				receipt.currencyCode,
				nextPrice * item.quantity,
			),
		),
	).toBeVisible();
});

test("Price update rolls back after a pending failure", async ({
	api,
	mockItem,
	openReceipt,
	card,
	itemPrice,
	awaitCacheKey,
	snapshotQueries,
	verifyToastTexts,
	faker,
}) => {
	const pause = api.createPause();
	const mockErrorMessage = `Mock "receiptItems.update" error`;
	api.mockFirst("receiptItems.update", async () => {
		await pause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	const { receipt, item } = await mockItem();
	await openReceipt(receipt);
	const nextPrice = faker.number.float({ min: 21, max: 30, fractionDigits: 2 });
	const input = {
		id: item.id,
		update: { type: "price" as const, price: nextPrice },
	};
	await snapshotQueries(
		async () => {
			await itemPrice.fill(nextPrice.toFixed(2));
			await itemPrice.press("Tab");
			await awaitCacheKey("receiptItems.update", { input, pending: 1 });
		},
		{ name: "pending" },
	);
	await snapshotQueries(
		async () => {
			pause.resolve();
			await awaitCacheKey("receiptItems.update", { input, error: 1 });
			await verifyToastTexts(`Error updating item: ${mockErrorMessage}`);
		},
		{ name: "error" },
	);
	await expect(
		card.getByText(
			formatCurrency(
				localSettings.locale,
				receipt.currencyCode,
				item.price * item.quantity,
			),
		),
	).toBeVisible();
});
