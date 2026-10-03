import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("payers: default owner can be replaced with an explicit peer", async ({
	api,
	setupItem,
	itemPayers,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItemPayers.add", ({ input }) => {
		calls.push(input);
		return { createdAt: Temporal.Now.zonedDateTimeISO() };
	});
	const { item, card, peerIds, peerNames } = await setupItem({ payers: 0 });
	await itemPayers(card).click();
	await card
		.page()
		.getByRole("dialog")
		.getByRole("option", { name: `avatar ${peerNames[0]}` })
		.click();
	await awaitCacheKey("receiptItemPayers.add", 1);
	expect(calls).toEqual([{ itemId: item.id, peerId: peerIds[1], part: 1 }]);
});
