import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("card: one consumer has no ratio rows and has an everyone action", async ({
	setupItem,
	itemPart,
	itemName,
}) => {
	const { card } = await setupItem({ consumers: 1 });
	await expect(itemName(card)).toHaveValue("Coffee beans");
	await expect(card.getByText(/25\.00/)).toBeVisible();
	await expect(card.getByText("Consumed by everyone")).toBeVisible();
	await expect(itemPart(card, 1, 1)).toHaveCount(0);
});

test("card: everyone adds only missing peers", async ({
	api,
	setupItem,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItemConsumers.add", ({ input }) => {
		calls.push(input);
		return { createdAt: Temporal.Now.zonedDateTimeISO() };
	});
	const { card, item, peerIds } = await setupItem({ consumers: 1 });
	await card.getByRole("button", { name: "Consumed by everyone" }).click();
	await awaitCacheKey("receiptItemConsumers.add", 2);
	expect(calls).toEqual(
		peerIds.slice(1).map((peerId) => ({ itemId: item.id, peerId, part: 1 })),
	);
	await expect(card.getByText("Consumed by everyone")).not.toBeAttached();
});

test("viewer sees plain item values without selectors or remove menu", async ({
	setupItem,
	itemName,
	itemPrice,
	itemQuantity,
	itemPayers,
	itemConsumers,
}) => {
	const { card } = await setupItem({ role: "viewer" });
	await expect(card.getByText("Coffee beans")).toBeVisible();
	await expect(itemName(card)).toHaveCount(0);
	await expect(itemPrice(card)).toHaveCount(0);
	await expect(itemQuantity(card)).toHaveCount(0);
	await expect(itemPayers(card)).toHaveCount(0);
	await expect(itemConsumers(card)).toHaveCount(0);
});

test("guest editor keeps inline controls and the two selectors", async ({
	setupItem,
	itemName,
	itemPayers,
	itemConsumers,
}) => {
	const { card } = await setupItem({ role: "editor" });
	await expect(itemName(card)).toBeVisible();
	await expect(itemPayers(card)).toBeVisible();
	await expect(itemConsumers(card)).toBeVisible();
});

test("everyone is currently available to a viewer", async ({
	api,
	setupItem,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItemConsumers.add", ({ input }) => {
		calls.push(input);
		return { createdAt: Temporal.Now.zonedDateTimeISO() };
	});
	const { card, item, peerIds } = await setupItem({
		role: "viewer",
		consumers: 1,
	});
	await card.getByRole("button", { name: "Consumed by everyone" }).click();
	await awaitCacheKey("receiptItemConsumers.add", 2);
	expect(calls).toEqual(
		peerIds.slice(1).map((peerId) => ({ itemId: item.id, peerId, part: 1 })),
	);
});

test("remove item without consumers from the item menu", async ({
	api,
	setupItem,
	itemMenu,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItems.remove", ({ input }) => {
		calls.push(input);
	});
	const { card, item } = await setupItem({ consumers: 0 });
	await itemMenu(card).click();
	await card.page().getByText("Remove item").click();
	await awaitCacheKey("receiptItems.remove", 1);
	expect(calls).toEqual([{ id: item.id }]);
	await expect(card).not.toBeAttached();
});
