import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("consumer part: ratio editor autofocuses and saves on blur", async ({
	api,
	setupItem,
	itemPart,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItemConsumers.update", ({ input }) => {
		calls.push(input);
	});
	const { card, item } = await setupItem();
	await itemPart(card, 1, 2).first().click();
	const input = card.getByRole("textbox", { name: "Item consumer part" });
	await expect(input).toBeFocused();
	await input.fill("2");
	await input.press("Tab");
	await awaitCacheKey("receiptItemConsumers.update", 1);
	expect(calls).toEqual([
		{
			itemId: item.id,
			peerId: item.consumers[1]?.peerId,
			update: { type: "part", part: 2 },
		},
	]);
});
