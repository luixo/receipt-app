import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("quantity: fractional change updates total; unchanged and zero do not mutate", async ({
	api,
	setupItem,
	itemQuantity,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItems.update", ({ input }) => {
		calls.push(input);
	});
	const { card, item } = await setupItem();
	const quantity = itemQuantity(card);
	await quantity.focus();
	await quantity.press("Tab");
	await quantity.fill("0");
	await quantity.press("Tab");
	expect(calls).toHaveLength(0);
	await quantity.fill("1.5");
	await quantity.press("Tab");
	await awaitCacheKey("receiptItems.update", 1);
	expect(calls).toEqual([
		{ id: item.id, update: { type: "quantity", quantity: 1.5 } },
	]);
	await expect(card.getByText(/18\.75/)).toBeVisible();
});
