import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { getMutationsByKey } from "~tests/frontend/utils/queries";

import { test } from "./utils";

test("Owner can change another participant's role; an unchanged role does nothing", async ({
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
	await participantRow(peer.name)
		.getByRole("button", { name: /avatar/ })
		.click();
	const role = participantRole(peer.name);
	await expect(role).toContainText("Editor");
	await role.click();
	await expect(page.getByRole("option", { name: "Owner" })).not.toBeAttached();
	await page.locator('[role="option"]').filter({ hasText: "Viewer" }).click();
	await awaitCacheKey("receiptParticipants.update", 1);
	await expect(role).toContainText("Viewer");
	await role.click();
	await page.locator('[role="option"]').filter({ hasText: "Viewer" }).click();
	const { nextQueryCache } = await snapshotQueries(async () => {
		await expect(role).toContainText("Viewer");
	});
	expect(
		getMutationsByKey(nextQueryCache, "receiptParticipants.update"),
	).toHaveLength(1);
	expect(
		getMutationsByKey(nextQueryCache, "receiptParticipants.update")[0]?.state
			.variables,
	).toEqual({
		receiptId: receipt.id,
		peerId: peer.id,
		update: { type: "role", role: "viewer" },
	});
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
	const message = "Role change rejected";
	api.mockFirst("receiptParticipants.update", () => {
		throw new TRPCError({ code: "FORBIDDEN", message });
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name)
		.getByRole("button", { name: /avatar/ })
		.click();
	await participantRole(peer.name).click();
	await page.locator('[role="option"]').filter({ hasText: "Viewer" }).click();
	await expect(participantRole(peer.name)).toContainText("Editor");
	await verifyToastTexts("Error updating participant: Role change rejected");
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
	await participantRow(peer.name)
		.getByRole("button", { name: /avatar/ })
		.click();
	await participantRole(peer.name).click();
	await page.locator('[role="option"]').filter({ hasText: "Viewer" }).click();
	await awaitCacheKey("receiptParticipants.update", { pending: 1 });
	await expect(participantRole(peer.name)).toHaveAttribute(
		"data-disabled",
		"true",
	);
	await participantRow(other.name)
		.getByRole("button", { name: /avatar/ })
		.click();
	await expect(participantRole(other.name)).not.toHaveAttribute(
		"data-disabled",
		"true",
	);
	pause.resolve();
	await awaitCacheKey("receiptParticipants.update", 1);
	await expect(participantRole(peer.name)).toContainText("Viewer");
});
