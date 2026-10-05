import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test.describe(`"receiptItemConsumers.add" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		itemConsumers,
		awaitCacheKey,
		snapshotQueries,
		modal,
	}) => {
		api.mockFirst("receiptItemConsumers.add", () => ({
			createdAt: Temporal.Now.zonedDateTimeISO(),
		}));
		const { receipt, item, peerIds, peerNames } = await mockItem({
			consumers: 1,
		});
		const [, peerId] = peerIds;
		assert.ok(peerId);
		await openReceipt(receipt);
		await itemConsumers.click();
		await snapshotQueries(async () => {
			await modal()
				.getByRole("option", { name: `avatar ${peerNames[0]}` })
				.click();
			await awaitCacheKey("receiptItemConsumers.add", {
				success: 1,
				input: { itemId: item.id, peerId, part: 1 },
			});
		});
		await expect(itemConsumers).toBeVisible();
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		itemConsumers,
		modal,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptItemConsumers.add" error`;
		api.mockFirst("receiptItemConsumers.add", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		const { receipt, item, peerIds, peerNames } = await mockItem({
			consumers: 1,
		});
		const [, peerId] = peerIds;
		assert.ok(peerId);
		await openReceipt(receipt);
		await itemConsumers.click();
		const input = { itemId: item.id, peerId, part: 1 };
		await snapshotQueries(
			async () => {
				await modal()
					.getByRole("option", { name: `avatar ${peerNames[0]}` })
					.click();
				await awaitCacheKey("receiptItemConsumers.add", { input, pending: 1 });
			},
			{ name: "pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemConsumers.add", { input, error: 1 });
				await verifyToastTexts(`Error adding consumer: ${mockErrorMessage}`);
			},
			{ name: "error" },
		);
	});
});
