import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateReceipt } from "~tests/frontend/generators/receipts";
import { getMutationsByKey } from "~tests/frontend/utils/queries";

import { test } from "./utils";

test("Empty preview opens and closes the owner picker", async ({
	mockReceipt,
	openReceipt,
	participantsPicker,
	participantsPreview,
	participantSuggestion,
	page,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptParticipants: () => [],
	});
	await openReceipt(receipt);
	await participantsPreview.click();
	await expect(participantsPicker).toBeVisible();
	await expect(participantSuggestion).toBeVisible();
	await expect(
		participantsPicker.getByRole("option", { name: /Add peer/ }),
	).toBeHidden();
	await page.keyboard.press("Escape");
	await expect(participantsPicker).toBeHidden();
});

test("Owner picker adds self as an editor, filters selected peers and releases failed selections", async ({
	api,
	mockReceipt,
	openReceipt,
	participantsPicker,
	participantSuggestion,
	page,
	awaitCacheKey,
	snapshotQueries,
	participantRows,
}) => {
	const { receipt, selfPeerId } = await mockReceipt({
		generateReceiptParticipants: () => [],
	});
	const pause = api.createPause();
	api.mockFirst("receiptParticipants.add", async () => {
		await pause.promise;
		return { createdAt: Temporal.Now.zonedDateTimeISO() };
	});
	await openReceipt(receipt);
	await page.getByRole("button", { name: "Add participants" }).click();
	const input = participantSuggestion.getByRole("combobox");
	await input.click();
	await expect(participantsPicker).toBeVisible();
	const self = page.locator('[role="option"]').first();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await self.click();
		await awaitCacheKey("receiptParticipants.add", { pending: 1 });
		await expect(self).toBeHidden();
		pause.resolve();
		await awaitCacheKey("receiptParticipants.add", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptParticipants.add")[0]?.state
			.variables,
	).toEqual({
		receiptId: receipt.id,
		peerId: selfPeerId,
		role: "editor",
	});
	await expect(participantRows).toHaveCount(1);
	await expect(input).toBeVisible();
});

test("Guest picker has no suggestions and shows its empty card", async ({
	mockReceipt,
	openReceipt,
	participantsPicker,
	participantSuggestion,
	page,
	faker,
	api,
}) => {
	const owner = {
		id: faker.string.uuid(),
		name: "Receipt owner",
		publicName: undefined,
		connectedUser: undefined,
	};
	api.mockUtils.mockPeers(owner);
	const { receipt } = await mockReceipt({
		generateReceiptParticipants: () => [],
		generateReceipt: (opts) => ({
			...defaultGenerateReceipt(opts),
			ownerPeerId: owner.id,
			debts: {
				direction: "incoming",
				id: undefined,
				hasMine: false,
				hasForeign: false,
			},
		}),
	});
	expect(receipt.ownerPeerId).not.toBe(receipt.selfPeerId);
	await openReceipt(receipt);
	await page.getByRole("button", { name: "Add participants" }).click();
	await expect(participantsPicker).toContainText("No participants yet");
	await expect(participantSuggestion).not.toBeAttached();
});

test("Failed addition releases the temporary picker selection", async ({
	api,
	mockReceipt,
	openReceipt,
	participantSuggestion,
	page,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptParticipants: () => [],
	});
	api.mockFirst("receiptParticipants.add", () => {
		throw new TRPCError({ code: "FORBIDDEN", message: "Cannot add peer" });
	});
	await openReceipt(receipt);
	await page.getByRole("button", { name: "Add participants" }).click();
	await participantSuggestion.getByRole("combobox").click();
	const self = page.locator('[role="option"]').first();
	await self.click();
	await awaitCacheKey("receiptParticipants.add", { error: 1 });
	await verifyToastTexts("Error adding participant: Cannot add peer");
	await participantSuggestion.getByRole("combobox").click();
	await expect(page.locator('[role="option"]').first()).toBeVisible();
});
