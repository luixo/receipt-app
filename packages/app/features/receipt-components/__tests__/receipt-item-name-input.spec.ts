import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-item.utils";

test("name: unchanged and invalid values do not save; changed blur updates the item", async ({
	api,
	setupItem,
	itemName,
	awaitCacheKey,
}) => {
	const calls: unknown[] = [];
	api.mockFirst("receiptItems.update", ({ input }) => {
		calls.push(input);
	});
	const { card, item } = await setupItem();
	const name = itemName(card);
	await expect(name).toHaveValue(item.name);
	await name.focus();
	await name.press("Tab");
	await name.fill("x");
	await name.press("Tab");
	expect(calls).toHaveLength(0);
	await name.fill("Espresso beans");
	await name.press("Tab");
	await awaitCacheKey("receiptItems.update", 1);
	expect(calls).toEqual([
		{ id: item.id, update: { type: "name", name: "Espresso beans" } },
	]);
	await expect(name).toHaveValue("Espresso beans");
});

test("name: pending and failed update rolls back", async ({
	api,
	setupItem,
	itemName,
	awaitCacheKey,
	verifyToastTexts,
	consoleManager,
	withLoader,
}) => {
	const pause = api.createPause();
	api.mockFirst("receiptItems.update", async () => {
		await pause.promise;
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Name update failed",
		});
	});
	void consoleManager;
	const { card, item } = await setupItem();
	const name = itemName(card);
	await name.fill("New coffee");
	await name.press("Tab");
	await expect(withLoader(card)).toBeVisible();
	pause.resolve();
	await awaitCacheKey("receiptItems.update", { error: 1 });
	await verifyToastTexts("Name update failed");
	await expect(name).toHaveValue("New coffee");
	await expect(card.getByText(item.name)).toBeHidden();
});
