import { test as originalTest } from "@playwright/test";
import type { Locator } from "@playwright/test";

export type Fixtures = {
	debtSyncStatus: Locator;
};

export const test = originalTest.extend<Fixtures>({
	debtSyncStatus: ({ page }, use) => use(page.getByTestId("debt-sync-status")),
});
