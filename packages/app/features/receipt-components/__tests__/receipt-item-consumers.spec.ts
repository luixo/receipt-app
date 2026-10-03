import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("consumers: selecting a missing peer adds a share without replacing existing consumers", async ({
	api,
	setupItem,
	itemConsumers,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItemConsumers.add", ({ input }) => {
		calls.push(input);
		return { createdAt: Temporal.Now.zonedDateTimeISO() };
	});
	const { item, card, peerIds, peerNames } = await setupItem({ consumers: 1 });
	await itemConsumers(card).click();
	await card
		.page()
		.getByRole("dialog")
		.getByRole("option", { name: `avatar ${peerNames[0]}` })
		.click();
	await awaitCacheKey("receiptItemConsumers.add", 1);
	expect(calls).toEqual([{ itemId: item.id, peerId: peerIds[1], part: 1 }]);
	await expect(itemConsumers(card)).toBeVisible();
});
