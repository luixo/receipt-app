import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Screen", async ({
	page,
	expectScreenshotWithSchemes,
	intentions,
	mockIntentions,
}) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				outboundAmount: 1,
				inboundAmount: 1,
			}),
	});

	await page.goto("/receipts/transfer-intentions");
	await expectScreenshotWithSchemes("wrapper.png", {
		mask: [intentions],
	});
});
