import { defaultGenerateTransferIntentions } from "./generators";
import { test } from "./utils";

test("Receipt snippet", async ({
	page,
	mockIntentions,
	expectScreenshotWithSchemes,
	receiptSnippet,
	awaitCacheKey,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				inboundAmount: 1,
			}),
	});

	await page.goto("/receipts/transfer-intentions");
	await awaitCacheKey("currency.getList");
	await expectScreenshotWithSchemes("receipt-snippet.png", {
		locator: receiptSnippet,
	});
});
