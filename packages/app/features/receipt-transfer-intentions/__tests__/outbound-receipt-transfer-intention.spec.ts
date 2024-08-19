import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Mutation'receiptTransferIntentions.remove'", async ({
	page,
	api,
	mockIntentions,
	outboundIntention,
	removeButton,
	snapshotQueries,
	verifyToastTexts,
	awaitCacheKey,
	keysLists,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({ ...opts, outboundAmount: 2 }),
	});
	api.mock("receiptTransferIntentions.remove", () => {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mock "receiptTransferIntentions.remove" error`,
		});
	});

	await page.goto("/receipts/transfer-intentions");
	await expect(outboundIntention).toHaveCount(2);

	await snapshotQueries(
		async () => {
			await removeButton.last().click();
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts(
				'Error removing receipt transfer intention: Mock "receiptTransferIntentions.remove" error',
			);
		},
		{ ...keysLists, name: "error" },
	);
	await expect(outboundIntention).toHaveCount(2);

	api.pause("receiptTransferIntentions.remove");
	await snapshotQueries(
		async () => {
			await removeButton.last().click();
			await verifyToastTexts();
		},
		{ ...keysLists, name: "loading" },
	);
	await expect(outboundIntention).toHaveCount(1);

	api.mock("receiptTransferIntentions.remove", () => undefined);
	await snapshotQueries(
		async () => {
			api.unpause("receiptTransferIntentions.remove");
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts();
		},
		{ ...keysLists, name: "success" },
	);
	await expect(outboundIntention).toHaveCount(1);
});

/*
	Following test cases:
	- Reject intention mutation (loading / error states)
	
	Are not being tested because of the optimistic update nature of their respective mutation
	E.g. the intentions disappear on click - and reappear in case of error
*/
