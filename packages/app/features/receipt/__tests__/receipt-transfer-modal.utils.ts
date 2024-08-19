import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	transferReceiptButton: Locator;
	sendTransferButton: Locator;
	cancelTransferButton: Locator;
	selectSuggestUser: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	selectSuggestUser: ({ page, modal }, use) =>
		use(async () => {
			const receiptTransferModal = modal();
			await receiptTransferModal.locator("input").focus();
			await page.locator("li[role='option']").first().click();
			await receiptTransferModal.locator("input").blur();
		}),

	transferReceiptButton: ({ page }, use) =>
		use(page.locator("button[title='Transfer receipt modal']")),
	sendTransferButton: ({ page }, use) =>
		use(page.locator("button[title='Send receipt transfer request']")),
	cancelTransferButton: ({ page }, use) =>
		use(page.locator("button[title='Cancel receipt transfer request']")),
});
