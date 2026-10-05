import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test.describe(`"receiptItemConsumers.update" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemPart,
		awaitCacheKey,
		snapshotQueries,
		faker,
	}) => {
		api.mockFirst("receiptItemConsumers.update", () => undefined);
		const { receipt, item } = await mockItem();
		assert.ok(item.consumers[1]);
		const [, { peerId }] = item.consumers;
		await openReceipt(receipt);
		await itemPart(1, 2).first().click();
		const input = card.getByRole("textbox", { name: "Item consumer part" });
		await expect(input).toBeFocused();
		const nextPart = faker.number.int({ min: 2, max: 5 });
		await snapshotQueries(async () => {
			await input.fill(String(nextPart));
			await input.press("Tab");
			await awaitCacheKey("receiptItemConsumers.update", {
				success: 1,
				input: {
					itemId: item.id,
					peerId,
					update: { type: "part", part: nextPart },
				},
			});
		});
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemPart,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
		withLoader,
		faker,
	}) => {
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptItemConsumers.update" error`;
		api.mockFirst("receiptItemConsumers.update", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		const { receipt, item } = await mockItem();
		assert.ok(item.consumers[1]);
		const [, { peerId }] = item.consumers;
		await openReceipt(receipt);
		await itemPart(1, 2).first().click();
		const nextPart = faker.number.int({ min: 2, max: 5 });
		const input = {
			itemId: item.id,
			peerId,
			update: { type: "part" as const, part: nextPart },
		};
		await snapshotQueries(
			async () => {
				const field = card.getByRole("textbox", { name: "Item consumer part" });
				await field.fill(String(nextPart));
				await field.press("Tab");
				await awaitCacheKey("receiptItemConsumers.update", {
					input,
					pending: 1,
				});
				await expect(withLoader(card)).toBeVisible();
			},
			{ name: "pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemConsumers.update", { input, error: 1 });
				await verifyToastTexts(`Error updating consumer: ${mockErrorMessage}`);
			},
			{ name: "error" },
		);
	});
});
