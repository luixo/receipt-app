import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Inbound intention", async ({
	page,
	mockIntentions,
	expectScreenshotWithSchemes,
	inboundIntention,
	receiptSnippet,
	user,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({ ...opts, inboundAmount: 2 }),
	});
	await page.goto("/receipts/transfer-intentions");
	await expectScreenshotWithSchemes("inbound-intention.png", {
		locator: inboundIntention.first(),
		mask: [receiptSnippet, user],
	});
});
