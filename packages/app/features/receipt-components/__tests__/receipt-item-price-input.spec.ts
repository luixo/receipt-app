import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("price: zero is rejected, excess precision normalizes to cents and total recalculates", async ({
	api,
	setupItem,
	itemPrice,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItems.update", ({ input }) => {
		calls.push(input);
	});
	const { card, item } = await setupItem();
	const price = itemPrice(card);
	await price.fill("0");
	await price.press("Tab");
	expect(calls).toHaveLength(0);
	await price.fill("1.234");
	await price.press("Tab");
	await awaitCacheKey("receiptItems.update", 1);
	expect(calls).toEqual([
		{ id: item.id, update: { type: "price", price: 1.23 } },
	]);
	await price.fill("10.25");
	await price.press("Tab");
	await awaitCacheKey("receiptItems.update", 2);
	expect(calls).toContainEqual({
		id: item.id,
		update: { type: "price", price: 10.25 },
	});
	await expect(card.getByText(/20\.50/)).toBeVisible();
});
