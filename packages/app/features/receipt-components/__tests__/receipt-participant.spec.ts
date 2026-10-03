import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	remapDebts,
	theirDesynced,
	theirNonExistent,
} from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	defaultGenerateReceiptItemsWithConsumers,
	defaultGenerateReceiptPayers,
} from "~tests/frontend/generators/receipts";
import { getMutationsByKey } from "~tests/frontend/utils/queries";

import { test } from "./utils";

test("Collapsed and expanded participant shows consumption, payment and receipt-level payer", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	participantPayerPart,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers, receiptItemsWithConsumers } = await mockReceipt({
		generateReceiptPayers: (opts) =>
			defaultGenerateReceiptPayers({
				...opts,
				peers: opts.peers,
				addSelf: true,
			}),
	});
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("receiptItemConsumers.add", {
		createdAt: Temporal.Now.zonedDateTimeISO(),
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await expect(row).toContainText(peer.name);
	await row.getByRole("button", { name: /avatar/ }).click();
	for (const item of receiptItemsWithConsumers) {
		await expect(row).toContainText(item.name);
	}
	const { nextQueryCache } = await snapshotQueries(async () => {
		await row.getByRole("button", { name: "+ payer" }).click();
		await awaitCacheKey("receiptItemConsumers.add", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptItemConsumers.add")[0]?.state
			.variables,
	).toEqual({
		itemId: receipt.id,
		peerId: peer.id,
		part: 1,
	});
	await expect(participantPayerPart(peer.name)).toHaveValue("1");
});

test("Owner removes a zero-balance non-consumer without confirmation", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers } = await mockReceipt({
		generateReceiptItemsWithConsumers: (opts) =>
			defaultGenerateReceiptItemsWithConsumers({
				...opts,
				participants: opts.participants.slice(1),
			}),
	});
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("receiptParticipants.remove", undefined);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await expect(row).toBeVisible();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await row.getByTestId("remove-button").click();
		await awaitCacheKey("receiptParticipants.remove", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptParticipants.remove")[0]?.state
			.variables,
	).toEqual({
		receiptId: receipt.id,
		peerId: peer.id,
	});
	await expect(row).not.toBeAttached();
});

test("Failed removal restores the participant after optimistic cleanup", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { receipt, peers } = await mockReceipt({
		generateReceiptItemsWithConsumers: (opts) =>
			defaultGenerateReceiptItemsWithConsumers({
				...opts,
				participants: opts.participants.slice(1),
			}),
	});
	const [peer] = peers;
	assert.ok(peer);
	const pause = api.createPause();
	api.mockFirst("receiptParticipants.remove", async () => {
		await pause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: "Removal rejected" });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("remove-button").click();
	await awaitCacheKey("receiptParticipants.remove", { pending: 1 });
	await expect(row).not.toBeAttached();
	pause.resolve();
	await awaitCacheKey("receiptParticipants.remove", { error: 1 });
	await expect(row).toBeVisible();
	await verifyToastTexts("Error removing participant: Removal rejected");
});

test("A nonzero-balance participant requires confirmation; cancel preserves the row", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	page,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers } = await mockReceipt();
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("receiptParticipants.remove", undefined);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("remove-button").click();
	await expect(
		page.getByRole("dialog", { name: /Are you sure/ }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(row).toBeVisible();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await row.getByTestId("remove-button").click();
		await page
			.getByRole("dialog", { name: /Are you sure/ })
			.getByRole("button", { name: "Yes" })
			.click();
		await awaitCacheKey("receiptParticipants.remove", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptParticipants.remove")[0]?.state
			.variables,
	).toEqual({ receiptId: receipt.id, peerId: peer.id });
	await expect(row).not.toBeAttached();
});

test("Missing outgoing debt warns the owner without requesting a nonexistent debt", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
}) => {
	const { receipt, peers } = await mockReceipt({ generateDebts: () => [] });
	const [peer] = peers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await expect(
		participantRow(peer.name).locator(".text-warning"),
	).toBeVisible();
});

// Playwright's fixture-based test has no test.each API.
// oxlint-disable-next-line vitest/prefer-each
for (const { name, map, warning, connected } of [
	{
		name: "mismatched outgoing debt",
		map: ourDesynced,
		warning: "text-danger",
		connected: false,
	},
	{
		name: "connected peer missing reverse debt",
		map: theirNonExistent,
		warning: "text-warning",
		connected: true,
	},
	{
		name: "connected peer with mismatched reverse debt",
		map: theirDesynced,
		warning: "text-warning",
		connected: true,
	},
	{
		name: "unconnected peer missing reverse debt",
		map: theirNonExistent,
		warning: "",
		connected: false,
	},
] as const) {
	test(`Owner debt warning: ${name}`, async ({
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		faker,
	}) => {
		const { receipt, peers } = await mockReceipt({
			generatePeers: (opts) =>
				defaultGeneratePeers(opts).map((peer) => ({
					...peer,
					connectedUser: connected
						? { id: faker.string.uuid(), email: faker.internet.email() }
						: undefined,
				})),
			generateDebts: (opts) =>
				remapDebts(map)(defaultGenerateDebtsFromReceipt(opts)),
		});
		const [peer] = peers;
		assert.ok(peer);
		await openReceipt(receipt);
		await openParticipantsPicker();
		const amount = participantRow(peer.name).locator(
			warning ? `.${warning}` : ".text-warning, .text-danger",
		);
		await expect(amount).toHaveCount(warning ? 1 : 0);
	});
}

test("Payer part autosaves on blur and zero immediately removes the receipt-level payer", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRows,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, selfPeerId } = await mockReceipt({
		generateReceiptPayers: (opts) =>
			defaultGenerateReceiptPayers({ ...opts, addSelf: true }).map((payer) => ({
				...payer,
				part: 2,
			})),
	});
	api.mockFirst("receiptItemConsumers.update", undefined);
	api.mockFirst("receiptItemConsumers.remove", undefined);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const owner = participantRows.first();
	await owner.getByRole("button", { name: /avatar/ }).click();
	const part = owner.getByRole("textbox", { name: "Item payer part" });
	await expect(part).toHaveValue("2");
	const { nextQueryCache } = await snapshotQueries(async () => {
		await part.fill("3");
		await part.press("Tab");
		await awaitCacheKey("receiptItemConsumers.update", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptItemConsumers.update")[0]?.state
			.variables,
	).toEqual({
		itemId: receipt.id,
		peerId: selfPeerId,
		update: { type: "part", part: 3 },
	});
	const { nextQueryCache: removedCache } = await snapshotQueries(
		async () => {
			await part.fill("0");
			await part.press("Tab");
			await awaitCacheKey("receiptItemConsumers.remove", 1);
		},
		{ name: "remove-payer" },
	);
	expect(
		getMutationsByKey(removedCache, "receiptItemConsumers.remove")[0]?.state
			.variables,
	).toEqual({ itemId: receipt.id, peerId: selfPeerId });
	await expect(owner.getByRole("button", { name: "+ payer" })).toBeVisible();
});
