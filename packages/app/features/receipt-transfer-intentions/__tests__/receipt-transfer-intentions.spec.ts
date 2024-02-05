import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import { defaultGenerateTransferIntentions } from "./generators";
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

	api.pause("receiptTransferIntentions.getAll");
	await page.goto("/receipts/transfer-intentions");
	await expect(inboundIntention).not.toBeAttached();
	await expect(outboundIntention).not.toBeAttached();
	await expect(emptyCardTransfers).not.toBeAttached();

	api.mock("receiptTransferIntentions.getAll", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receiptTransferIntentions.getAll" error`,
		});
	});
	api.unpause("receiptTransferIntentions.getAll");
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
}) => {
	mockIntentions();
	await snapshotQueries(
		() => page.goto("/receipts/transfer-intentions"),
		keysLists,
	);
	await expect(emptyCardTransfers).toBeAttached();
});

test("Initial load with intentions", async ({
	page,
	keysLists,
	mockIntentions,
	snapshotQueries,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				outboundAmount: 2,
				inboundAmount: 2,
			}),
	});

	await snapshotQueries(
		() => page.goto("/receipts/transfer-intentions"),
		keysLists,
	);
});
