import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Owner can change another participant's role", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	participantRole,
	page,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { receipt, peers } = await mockReceipt();
	const [peer] = peers;
	assert.ok(peer);
	api.mockFirst("receiptParticipants.update", undefined);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	const role = participantRole(peer.name);
	await expect(role).toContainText("Editor");
	await role.click();
	const options = page
		.getByRole("option", { includeHidden: true })
		.filter({ visible: true });
	await expect(options.filter({ hasText: "Owner" })).not.toBeAttached();
	await snapshotQueries(async () => {
		await options.filter({ hasText: "Viewer" }).click();
		await awaitCacheKey("receiptParticipants.update", 1);
	});
	await expect(role).toContainText("Viewer");
	await role.click();
	await snapshotQueries(
		async () => {
			await options.filter({ hasText: "Viewer" }).click();
			await expect(role).toContainText("Viewer");
		},
		{ name: "unchanged-role" },
	);
});

test("Failed role change restores the previous role", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	participantRole,
	page,
	verifyToastTexts,
}) => {
	const { receipt, peers } = await mockReceipt();
	const [peer] = peers;
	assert.ok(peer);
	const mockErrorMessage = `Mock "receiptParticipants.update" error`;
	api.mockFirst("receiptParticipants.update", () => {
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	await participantRole(peer.name).click();
	await page
		.getByRole("option", { includeHidden: true })
		.filter({ visible: true, hasText: "Viewer" })
		.click();
	await expect(participantRole(peer.name)).toContainText("Editor");
	await verifyToastTexts(`Error updating participant: ${mockErrorMessage}`);
});

test("Only the peer whose role is being updated is disabled while pending", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	participantRole,
	page,
	awaitCacheKey,
}) => {
	const { receipt, peers } = await mockReceipt();
	const [peer, other] = peers;
	assert.ok(peer);
	assert.ok(other);
	const pause = api.createPause();
	api.mockFirst("receiptParticipants.update", async () => {
		await pause.promise;
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	await participantRole(peer.name).click();
	await page
		.getByRole("option", { includeHidden: true })
		.filter({ visible: true, hasText: "Viewer" })
		.click();
	await awaitCacheKey("receiptParticipants.update", { pending: 1 });
	await expect(participantRole(peer.name)).toHaveAttribute(
		"data-disabled",
		"true",
	);
	await participantRow(other.name).getByTestId("user-avatar").click();
	await expect(participantRole(other.name)).not.toHaveAttribute(
		"data-disabled",
		"true",
	);
});
