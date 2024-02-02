import type { Locator } from "@playwright/test";

import { test as originalTest } from "./debts.utils";

type Fixtures = {
	debtSyncStatus: Locator;
	zeroSumIcon: Locator;
	receiptMismatchIcon: Locator;
};

export const test = originalTest.extend<Fixtures>({
	debtSyncStatus: ({ page }, use) => use(page.getByTestId("debt-sync-status")),
	zeroSumIcon: ({ page }, use) => use(page.getByTestId("receipt-zero-icon")),
	receiptMismatchIcon: ({ page }, use) =>
		use(page.getByTestId("receipt-mismatch-icon")),
});
