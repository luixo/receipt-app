import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateTransferIntentions } from "~tests/frontend/generators/receipt-transfer-intentions";

import { test } from "./utils";

test("Screen", async ({ page, api, backLink, mockIntentions }) => {
	mockIntentions({
		generateTransferIntentions: (opts) =>
			defaultGenerateTransferIntentions({
				...opts,
				outboundAmount: 1,
				inboundAmount: 1,
			}),
	});

	await page.goto("/receipts/transfer-intentions");
	await expect(page).toHaveTitle("RA - Receipt transfer intentions");
	api.mockUtils.emptyReceipts();
	await backLink.click();
	await expect(page).toHaveURL("/receipts");
});
