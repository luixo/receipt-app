import assert from "node:assert";

import { test } from "~app/features/receipt-components/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	remapDebts,
	theirDesynced,
} from "~tests/frontend/generators/debts";
import { getMutationsByKey } from "~tests/frontend/utils/queries";

test("Owner sends a missing debt to a peer with receipt metadata", async ({
	api,
	faker,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
	fromUnitToSubunit,
	fromSubunitToUnit,
}) => {
	const {
		receipt,
		peers,
		participants,
		receiptItemsWithConsumers,
		receiptPayers,
	} = await mockReceipt({ generateDebts: () => [] });
	const [peer] = peers;
	assert.ok(peer);
	const [expectedDebt] = defaultGenerateDebtsFromReceipt({
		faker,
		selfPeerId: receipt.selfPeerId,
		receiptBase: receipt,
		receiptItemsWithConsumers,
		participants,
		receiptPayers,
		fromUnitToSubunit,
		fromSubunitToUnit,
	});
	assert.ok(expectedDebt);
	api.mockFirst("debts.add", {
		id: faker.string.uuid(),
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		reverseAccepted: false,
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByRole("button", { name: /avatar/ }).click();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await row.getByRole("button", { name: "Send debt to a peer" }).click();
		await awaitCacheKey("debts.add", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "debts.add")[0]?.state.variables,
	).toMatchObject({
		peerId: peer.id,
		amount: expectedDebt.amount,
		currencyCode: receipt.currencyCode,
		timestamp: receipt.issued,
		receiptId: receipt.id,
		note: `Receipt "${receipt.name}"`,
	});
});

test("Owner updates a mismatched outgoing debt; reverse mismatch alone does not offer update", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers, receiptDebts } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	const debt = receiptDebts.find(({ peerId }) => peerId === peer.id);
	assert.ok(debt);
	api.mockFirst("debts.update", {
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		reverseUpdated: false,
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByRole("button", { name: /avatar/ }).click();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await row.getByRole("button", { name: "Update debt for a peer" }).click();
		await awaitCacheKey("debts.update", 1);
	});
	expect(
		getMutationsByKey(nextQueryCache, "debts.update")[0]?.state.variables,
	).toMatchObject({
		id: debt.id,
		update: {
			amount: debt.amount - 1,
			currencyCode: receipt.currencyCode,
			timestamp: receipt.issued,
			receiptId: receipt.id,
		},
	});
});

test("A matching outgoing debt retains the sync action when only the reverse side differs", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
}) => {
	const { receipt, peers } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(theirDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByRole("button", { name: /avatar/ }).click();
	await expect(
		row.getByRole("button", { name: "Update debt for a peer" }),
	).not.toBeAttached();
});
