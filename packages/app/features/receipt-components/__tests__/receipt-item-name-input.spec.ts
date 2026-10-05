import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test.describe(`"receiptItems.update" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		itemName,
		awaitCacheKey,
		snapshotQueries,
		faker,
	}) => {
		api.mockFirst("receiptItems.update", () => undefined);
		const { receipt, item } = await mockItem();
		await openReceipt(receipt);
		await expect(itemName).toHaveValue(item.name);
		await itemName.focus();
		await itemName.press("Tab");
		await itemName.fill("x");
		await itemName.press("Tab");
		const nextName = faker.commerce.productName();
		await snapshotQueries(async () => {
			await itemName.fill(nextName);
			await itemName.press("Tab");
			await awaitCacheKey("receiptItems.update", {
				success: 1,
				input: { id: item.id, update: { type: "name", name: nextName } },
			});
		});
		await expect(itemName).toHaveValue(nextName);
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		itemName,
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
		const nextName = faker.commerce.productName();
		const input = {
			id: item.id,
			update: { type: "name" as const, name: nextName },
		};
		await snapshotQueries(
			async () => {
				await itemName.fill(nextName);
				await itemName.press("Tab");
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
	});
});
