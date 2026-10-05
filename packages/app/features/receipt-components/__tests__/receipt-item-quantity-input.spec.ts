import { TRPCError } from "@trpc/server";

import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test.describe(`"receiptItems.update" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemQuantity,
		awaitCacheKey,
		snapshotQueries,
		faker,
	}) => {
		api.mockFirst("receiptItems.update", () => undefined);
		const { receipt, item } = await mockItem();
		await openReceipt(receipt);
		await itemQuantity.focus();
		await itemQuantity.press("Tab");
		await itemQuantity.fill("0");
		await itemQuantity.press("Tab");
		const nextQuantity = faker.number.int({ min: 11, max: 19 }) / 10;
		await snapshotQueries(async () => {
			await itemQuantity.fill(String(nextQuantity));
			await itemQuantity.press("Tab");
			await awaitCacheKey("receiptItems.update", {
				success: 1,
				input: {
					id: item.id,
					update: { type: "quantity", quantity: nextQuantity },
				},
			});
		});
		await expect(
			card.getByText(
				formatCurrency(
					localSettings.locale,
					receipt.currencyCode,
					item.price * nextQuantity,
				),
			),
		).toBeVisible();
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemQuantity,
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
		const nextQuantity = faker.number.int({ min: 11, max: 19 }) / 10;
		const input = {
			id: item.id,
			update: { type: "quantity" as const, quantity: nextQuantity },
		};
		await snapshotQueries(
			async () => {
				await itemQuantity.fill(String(nextQuantity));
				await itemQuantity.press("Tab");
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
});
