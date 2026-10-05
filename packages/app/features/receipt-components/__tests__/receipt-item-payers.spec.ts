import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test } from "./receipt-item.utils";

test.describe(`"receiptItemPayers.add" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		itemPayers,
		awaitCacheKey,
		snapshotQueries,
		modal,
	}) => {
		api.mockFirst("receiptItemPayers.add", () => ({
			createdAt: Temporal.Now.zonedDateTimeISO(),
		}));
		const { receipt, item, peerIds } = await mockItem({ payers: 0 });
		const [, peerId] = peerIds;
		assert.ok(peerId);
		await openReceipt(receipt);
		await itemPayers.click();
		await snapshotQueries(async () => {
			await modal().getByRole("option").nth(1).click();
			await awaitCacheKey("receiptItemPayers.add", {
				success: 1,
				input: { itemId: item.id, peerId, part: 1 },
			});
		});
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		itemPayers,
		modal,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptItemPayers.add" error`;
		api.mockFirst("receiptItemPayers.add", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		const { receipt, item, peerIds } = await mockItem({ payers: 0 });
		const [, peerId] = peerIds;
		assert.ok(peerId);
		await openReceipt(receipt);
		await itemPayers.click();
		const input = { itemId: item.id, peerId, part: 1 };
		await snapshotQueries(
			async () => {
				await modal().getByRole("option").nth(1).click();
				await awaitCacheKey("receiptItemPayers.add", { input, pending: 1 });
			},
			{ name: "pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemPayers.add", { input, error: 1 });
				await verifyToastTexts(`Error adding payer: ${mockErrorMessage}`);
			},
			{ name: "error" },
		);
	});
});
