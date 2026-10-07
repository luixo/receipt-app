import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test } from "~app/features/receipt-components/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	remapDebts,
	theirDesynced,
} from "~tests/frontend/generators/debts";

test("Owner sends a missing debt to a peer with receipt metadata", async ({
	api,
	faker,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers } = await mockReceipt({ generateDebts: () => [] });
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("debts.add", {
		id: faker.string.uuid(),
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		reverseAccepted: false,
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("user-avatar").click();
	await snapshotQueries(async () => {
		await row.getByRole("button", { name: "Send debt to a peer" }).click();
		await awaitCacheKey("debts.add", 1);
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
	const { receipt, peers } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("debts.update", {
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		reverseUpdated: false,
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("user-avatar").click();
	await snapshotQueries(async () => {
		await row.getByRole("button", { name: "Update debt for a peer" }).click();
		await awaitCacheKey("debts.update", 1);
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
	await row.getByTestId("user-avatar").click();
	await expect(
		row.getByRole("button", { name: "Update debt for a peer" }),
	).not.toBeAttached();
});

test(`'debts.add' mutation`, async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
	verifyToastTexts,
}) => {
	const { receipt, peers } = await mockReceipt({ generateDebts: () => [] });
	const [peer] = peers;
	assert.ok(peer);
	const pause = api.createPause();
	const mockErrorMessage = `Mock "debts.add" error`;
	api.mockFirst("debts.add", async () => {
		await pause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("user-avatar").click();
	const send = row.getByRole("button", { name: "Send debt to a peer" });
	await snapshotQueries(
		async () => {
			await send.click();
			await awaitCacheKey("debts.add", { pending: 1 });
			await expect(row.getByRole("button", { name: "Loading" })).toBeDisabled();
		},
		{ name: "add-debt-pending" },
	);
	await snapshotQueries(
		async () => {
			pause.resolve();
			await awaitCacheKey("debts.add", { error: 1 });
			await verifyToastTexts(`Error adding debt: ${mockErrorMessage}`);
			await expect(
				row.getByRole("button", { name: "Send debt to a peer" }),
			).toBeVisible();
		},
		{ name: "add-debt-error" },
	);
});

test(`'debts.update' mutation`, async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	awaitCacheKey,
	snapshotQueries,
	verifyToastTexts,
	toast,
}) => {
	const { receipt, peers } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	const pause = api.createPause();
	const mockErrorMessage = `Mock "debts.update" error`;
	api.mockFirst("debts.update", async () => {
		await pause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("user-avatar").click();
	const update = row.getByRole("button", { name: "Update debt for a peer" });
	await snapshotQueries(
		async () => {
			await update.click();
			await awaitCacheKey("debts.update", { pending: 1 });
			await expect(update).not.toBeAttached();
			await expect(toast).toContainText("Loading..");
		},
		{ name: "update-debt-pending" },
	);
	await snapshotQueries(
		async () => {
			pause.resolve();
			await awaitCacheKey("debts.update", { error: 1 });
			await verifyToastTexts(`Error updating debt: ${mockErrorMessage}`);
			await expect(
				row.getByRole("button", { name: "Update debt for a peer" }),
			).toBeVisible();
		},
		{ name: "update-debt-error" },
	);
});

test(`"debts.get" suspense`, async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	consoleManager,
}) => {
	const { receipt, peers, receiptDebts } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	const debt = receiptDebts.find(({ peerId }) => peerId === peer.id);
	assert.ok(debt);
	const pause = api.createPause();
	const mockErrorMessage = `Mock "debts.get" error`;
	consoleManager.ignore(mockErrorMessage);
	api.mockFirst("debts.get", async ({ input, next }) => {
		if (input.id !== debt.id) {
			return next();
		}
		await pause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await row.getByTestId("user-avatar").click();
	const updateDebtButton = row.getByRole("button", {
		name: "Update debt for a peer",
	});
	await expect(updateDebtButton).not.toBeAttached();
	pause.resolve();
	await expect(row.getByTestId("error-message")).toContainText(
		mockErrorMessage,
	);
});
