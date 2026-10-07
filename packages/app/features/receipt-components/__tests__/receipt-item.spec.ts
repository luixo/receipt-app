import { TRPCError } from "@trpc/server";

import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test.describe("Editable item", () => {
	test("One consumer", async ({ mockItem, openReceipt, card, itemName }) => {
		const { receipt, item } = await mockItem({ consumers: 1 });
		await openReceipt(receipt);
		await expect(itemName).toHaveValue(item.name);
		await expect(
			card.getByText(
				formatCurrency(
					localSettings.locale,
					receipt.currencyCode,
					item.price * item.quantity,
				),
			),
		).toBeVisible();
		await expect(card.getByText("Consumed by everyone")).toBeVisible();
		await expect(
			card.getByRole("button").filter({ hasText: " / " }),
		).toHaveCount(0);
	});

	test(`'Consumed by everyone' button`, async ({
		api,
		mockItem,
		openReceipt,
		card,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		api.mockFirst("receiptItemConsumers.add", () => ({
			createdAt: Temporal.Now.zonedDateTimeISO(),
		}));
		const { receipt, peerIds } = await mockItem({ consumers: 1 });
		await openReceipt(receipt);
		await snapshotQueries(async () => {
			await card.getByRole("button", { name: "Consumed by everyone" }).click();
			await awaitCacheKey("receiptItemConsumers.add", {
				success: peerIds.length - 1,
			});
		});
		await expect(card.getByText("Consumed by everyone")).not.toBeAttached();
	});
});

test.describe("Guest item", () => {
	test("Viewer view", async ({
		mockItem,
		openReceipt,
		card,
		itemName,
		itemPrice,
		itemQuantity,
		itemPayers,
		itemConsumers,
	}) => {
		const { receipt, item } = await mockItem({ role: "viewer" });
		await openReceipt(receipt);
		await expect(card.getByText(item.name)).toBeVisible();
		await expect(itemName).toHaveCount(0);
		await expect(itemPrice).toHaveCount(0);
		await expect(itemQuantity).toHaveCount(0);
		await expect(itemPayers).toHaveCount(0);
		await expect(itemConsumers).toHaveCount(0);
		await expect(
			card.getByRole("button", { name: "Consumed by everyone" }),
		).toHaveCount(0);
	});

	test("Editor view", async ({
		mockItem,
		openReceipt,
		itemName,
		itemPayers,
		itemConsumers,
	}) => {
		const { receipt } = await mockItem({ role: "editor" });
		await openReceipt(receipt);
		await expect(itemName).toBeVisible();
		await expect(itemPayers).toBeVisible();
		await expect(itemConsumers).toBeVisible();
	});
});

test.describe(`"receiptItems.remove" mutation`, () => {
	test("success", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemMenu,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		api.mockFirst("receiptItems.remove", () => undefined);
		const { receipt, item } = await mockItem({ consumers: 0 });
		await openReceipt(receipt);
		await itemMenu.click();
		await snapshotQueries(async () => {
			await card.page().getByText("Remove item").click();
			await awaitCacheKey("receiptItems.remove", {
				success: 1,
				input: { id: item.id },
			});
		});
		await expect(card).not.toBeAttached();
	});

	test("pending / error", async ({
		api,
		mockItem,
		openReceipt,
		card,
		itemMenu,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptItems.remove" error`;
		api.mockFirst("receiptItems.remove", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		const { receipt, item } = await mockItem({ consumers: 0 });
		await openReceipt(receipt);
		await itemMenu.click();
		const input = { id: item.id };
		await snapshotQueries(
			async () => {
				await card.page().getByText("Remove item").click();
				await awaitCacheKey("receiptItems.remove", { input, pending: 1 });
			},
			{ name: "pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItems.remove", { input, error: 1 });
				await verifyToastTexts(`Error removing item: ${mockErrorMessage}`);
			},
			{ name: "error" },
		);
		await expect(card).toBeVisible();
	});
});
