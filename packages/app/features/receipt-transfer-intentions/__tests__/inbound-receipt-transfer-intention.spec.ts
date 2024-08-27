import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Mutation 'receiptTransferIntentions.accept'", async ({
	page,
	api,
	mockIntentions,
	inboundIntention,
	acceptButton,
	snapshotQueries,
	verifyToastTexts,
	awaitCacheKey,
	keysLists,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({ ...opts, inboundAmount: 2 }),
	});

	await page.goto("/receipts/transfer-intentions");
	await expect(inboundIntention).toHaveCount(2);

	api.mock("receiptTransferIntentions.accept", () => {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mock "receiptTransferIntentions.accept" error`,
		});
	});
	await snapshotQueries(
		async () => {
			await acceptButton.last().click();
			await awaitCacheKey("receiptTransferIntentions.accept");
			await verifyToastTexts(
				'Error accepting receipt: Mock "receiptTransferIntentions.accept" error',
			);
		},
		{ ...keysLists, name: "error" },
	);
	await expect(inboundIntention).toHaveCount(2);

	const receiptTransferIntentionAcceptPause = api.createPause();
	api.mock("receiptTransferIntentions.accept", async () => {
		await receiptTransferIntentionAcceptPause.wait();
	});
	await snapshotQueries(
		async () => {
			await acceptButton.last().click();
			await verifyToastTexts();
		},
		{ ...keysLists, name: "loading" },
	);
	await expect(inboundIntention).toHaveCount(1);

	await snapshotQueries(
		async () => {
			receiptTransferIntentionAcceptPause.resolve();
			await awaitCacheKey("receiptTransferIntentions.accept");
			await verifyToastTexts("Receipt was successfully accepted");
		},
		{ ...keysLists, name: "success" },
	);
	await expect(inboundIntention).toHaveCount(1);
});

test("Mutation 'receiptTransferIntentions.remove'", async ({
	page,
	api,
	mockIntentions,
	inboundIntention,
	rejectButton,
	snapshotQueries,
	verifyToastTexts,
	awaitCacheKey,
	keysLists,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({ ...opts, inboundAmount: 2 }),
	});

	await page.goto("/receipts/transfer-intentions");
	await expect(inboundIntention).toHaveCount(2);

	api.mock("receiptTransferIntentions.remove", () => {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mock "receiptTransferIntentions.remove" error`,
		});
	});
	await snapshotQueries(
		async () => {
			await rejectButton.last().click();
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts(
				'Error removing receipt transfer intention: Mock "receiptTransferIntentions.remove" error',
			);
		},
		{ ...keysLists, name: "error" },
	);
	await expect(inboundIntention).toHaveCount(2);

	const receiptTransferIntentionRemovePause = api.createPause();
	api.mock("receiptTransferIntentions.remove", async () => {
		await receiptTransferIntentionRemovePause.wait();
	});
	await snapshotQueries(
		async () => {
			await rejectButton.last().click();
			await verifyToastTexts();
		},
		{ ...keysLists, name: "loading" },
	);
	await expect(inboundIntention).toHaveCount(1);

	await snapshotQueries(
		async () => {
			receiptTransferIntentionRemovePause.resolve();
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts();
		},
		{ ...keysLists, name: "success" },
	);
	await expect(inboundIntention).toHaveCount(1);
});

/*
	Following test cases:
	- Accept intention mutation (loading / error states)
	- Remove intention mutation (loading / error states)
	
	Are not being tested because of the optimistic update nature of their respective mutation
	E.g. the intentions disappear on click - and reappear in case of error
*/
