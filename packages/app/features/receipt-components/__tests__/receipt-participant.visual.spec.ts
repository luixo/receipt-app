import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
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
	await otherRow.getByRole("button", { name: /avatar/ }).click();
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
