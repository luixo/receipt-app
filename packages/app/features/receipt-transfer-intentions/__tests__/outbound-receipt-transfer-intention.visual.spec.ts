import { defaultGenerateTransferIntentions } from "./generators";
import { test } from "./utils";

test("Outbound intention", async ({
	page,
	mockIntentions,
	expectScreenshotWithSchemes,
	outboundIntention,
	receiptSnippet,
	user,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({ ...opts, outboundAmount: 1 }),
	});
	await page.goto("/receipts/transfer-intentions");
	await expectScreenshotWithSchemes("outbound-intention.png", {
		locator: outboundIntention,
		mask: [receiptSnippet, user],
	});
});
