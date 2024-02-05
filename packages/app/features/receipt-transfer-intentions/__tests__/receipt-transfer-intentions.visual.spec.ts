import { defaultGenerateTransferIntentions } from "./generators";
import { test } from "./utils";

test("Intentions", async ({
	page,
	mockIntentions,
	expectScreenshotWithSchemes,
	inboundIntention,
	outboundIntention,
	intentions,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				outboundAmount: 2,
				inboundAmount: 2,
			}),
	});
	await page.goto("/receipts/transfer-intentions");
	await expectScreenshotWithSchemes("intentions.png", {
		locator: intentions,
		mask: [inboundIntention, outboundIntention],
	});
});

test("Empty state", async ({
	page,
	intentions,
	expectScreenshotWithSchemes,
	mockIntentions,
}) => {
	mockIntentions();
	await page.goto("/receipts/transfer-intentions");
	await expectScreenshotWithSchemes("empty.png", {
		locator: intentions,
	});
});
