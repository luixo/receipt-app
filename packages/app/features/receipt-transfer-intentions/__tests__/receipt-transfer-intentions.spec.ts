import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Initial load 'receiptTransferIntentions.getAll' pending / error", async ({
	api,
	page,
	errorMessage,
	emptyCardTransfers,
	inboundIntention,
	outboundIntention,
	mockIntentions,
}) => {
	mockIntentions();

	const receiptTransferIntentionsPause = api.createPause();
	api.mock("receiptTransferIntentions.getAll", async () => {
		await receiptTransferIntentionsPause.wait();
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receiptTransferIntentions.getAll" error`,
		});
	});
	await page.goto("/receipts/transfer-intentions");
	await expect(inboundIntention).not.toBeAttached();
	await expect(outboundIntention).not.toBeAttached();
	await expect(emptyCardTransfers).not.toBeAttached();

	receiptTransferIntentionsPause.resolve();
	await expect(
		errorMessage(`Mock "receiptTransferIntentions.getAll" error`),
	).toBeVisible();
	await expect(inboundIntention).not.toBeAttached();
	await expect(outboundIntention).not.toBeAttached();
	await expect(emptyCardTransfers).not.toBeAttached();
});

test("Initial load with no intentions", async ({
	page,
	keysLists,
	emptyCardTransfers,
	snapshotQueries,
	mockIntentions,
	awaitCacheKey,
}) => {
	mockIntentions();
	await snapshotQueries(async () => {
		await page.goto("/receipts/transfer-intentions");
		await awaitCacheKey("receiptTransferIntentions.getAll");
	}, keysLists);
	await expect(emptyCardTransfers).toBeAttached();
});

test("Initial load with intentions", async ({
	page,
	keysLists,
	mockIntentions,
	snapshotQueries,
	awaitCacheKey,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				outboundAmount: 2,
				inboundAmount: 2,
			}),
	});

	await snapshotQueries(async () => {
		await page.goto("/receipts/transfer-intentions");
		await awaitCacheKey("receiptTransferIntentions.getAll");
	}, keysLists);
});
