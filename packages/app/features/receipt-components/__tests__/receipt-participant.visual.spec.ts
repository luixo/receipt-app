import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItemsWithConsumers,
	defaultGenerateReceiptPayers,
} from "~tests/frontend/generators/receipts";

import { test } from "./utils";

test("Collapsed, expanded, and dimmed participant rows", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, peers } = await mockReceipt({
		generateReceiptPayers: (opts) =>
			defaultGenerateReceiptPayers({
				...opts,
				peers: opts.peers,
				addSelf: true,
			}),
		generateReceiptItemsWithConsumers: (opts) =>
			defaultGenerateReceiptItemsWithConsumers({
				...opts,
				participants: opts.participants.slice(1),
			}),
	});
	const [peer, secondPeer] = peers;
	assert.ok(peer);
	assert.ok(secondPeer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const row = participantRow(peer.name);
	await expect(row).toBeVisible();
	await expectScreenshotWithSchemes("dimmed-row.png", {
		locator: row,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
	const otherRow = participantRow(secondPeer.name);
	await expectScreenshotWithSchemes("collapsed-row.png", {
		locator: otherRow,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
	await otherRow.getByTestId("user-avatar").click();
	await expectScreenshotWithSchemes("expanded-row.png", {
		locator: otherRow,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Guest sees no warnings for other participants", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantsPicker,
	expectScreenshotWithSchemes,
	skip,
	awaitCacheKey,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, selfPeerId } = await mockReceipt({
		generateReceiptParticipants: ({ selfPeerId: guestId, peers: allPeers }) => {
			const [owner, ...rest] = allPeers;
			assert.ok(owner);
			return [
				{
					peerId: owner.id,
					role: "owner" as const,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				},
				...rest.map((peer) => ({
					peerId: peer.id,
					role: "editor" as const,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				})),
				{
					peerId: guestId,
					role: "editor" as const,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				},
			];
		},
		generateReceipt: (opts) => ({
			...defaultGenerateReceipt(opts),
			ownerPeerId: opts.peers[0]?.id ?? opts.selfPeerId,
			debts: {
				direction: "incoming",
				id: undefined,
				hasMine: false,
				hasForeign: false,
			},
		}),
	});
	api.mockFirst("peers.getForeign", ({ input, next }) =>
		input.id === selfPeerId
			? {
					id: selfPeerId,
					name: "Guest",
					publicName: undefined,
					connectedUser: undefined,
				}
			: next(),
	);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await awaitCacheKey("receipts.get");
	await expectScreenshotWithSchemes("guest-other-participants.png", {
		locator: participantsPicker,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Payer part shows the total-parts denominator", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRows,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateReceiptPayers: (opts) =>
			defaultGenerateReceiptPayers({ ...opts, addSelf: true }).map((payer) => ({
				...payer,
				part: 2,
			})),
	});
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRows.first().getByTestId("user-avatar").click();
	await expect(
		participantRows.first().getByRole("textbox", { name: "Item payer part" }),
	).toBeVisible();
	await expectScreenshotWithSchemes("payer-total-parts.png", {
		locator: participantRows.first(),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});
