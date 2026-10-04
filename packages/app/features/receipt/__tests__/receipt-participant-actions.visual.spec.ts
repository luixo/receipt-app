import assert from "node:assert";

import { test } from "~app/features/receipt-components/__tests__/utils";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	remapDebts,
} from "~tests/frontend/generators/debts";
import { defaultGenerateReceiptItemsWithConsumers } from "~tests/frontend/generators/receipts";

test("Missing debt send action", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, peers } = await mockReceipt({ generateDebts: () => [] });
	const [peer] = peers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	await awaitCacheKey("receipts.get");
	await expectScreenshotWithSchemes("send-debt.png", {
		locator: participantRow(peer.name).getByRole("button", {
			name: "Send debt to a peer",
		}),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Mismatched debt update action", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, peers } = await mockReceipt({
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	const [peer] = peers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	await awaitCacheKey("receipts.get");
	await expectScreenshotWithSchemes("update-debt.png", {
		locator: participantRow(peer.name).getByRole("button", {
			name: "Update debt for a peer",
		}),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Zero-balance peer action", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, peers } = await mockReceipt({
		generateReceiptItemsWithConsumers: (opts) =>
			defaultGenerateReceiptItemsWithConsumers({
				...opts,
				participants: opts.participants.slice(1),
			}),
	});
	const [peer] = peers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name).getByTestId("user-avatar").click();
	await awaitCacheKey("receipts.get");
	await expectScreenshotWithSchemes("zero-debt.png", {
		locator: participantRow(peer.name).getByTestId("receipt-zero-icon"),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});
