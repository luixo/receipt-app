import type { Locator } from "@playwright/test";

import type { GenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
import type { GenerateReceipt } from "~tests/frontend/generators/receipts";

import { test as originalTest } from "./utils";

type LocalGenerateReceipt = (
	opts: Parameters<GenerateReceipt>[0] & {
		debts: ReturnType<GenerateDebtsFromReceipt>;
	},
) => ReturnType<GenerateReceipt>;

type Fixtures = {
	sendDebtButton: Locator;
	updateDebtButton: Locator;
	propagateDebtsButton: Locator;
	updateDebtsButton: Locator;
	syncedDebtsButton: Locator;
	debtSyncStatus: Locator;
	openReceiptWithDebts: (
		receipt: ReturnType<LocalGenerateReceipt>,
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	updateDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Update debt for a user']")),

	sendDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Send debt to a user']")),

	propagateDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Propagate debts']")),

	updateDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Update debts']")),

	syncedDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Synced']")),

	openReceiptWithDebts: ({ openReceipt, awaitCacheKey }, use) =>
		use(async (receipt) => {
			await openReceipt(receipt);
			const debtsAmount =
				receipt.debts.direction === "outcoming"
					? receipt.debts.debts.length
					: receipt.debts.id
						? 1
						: undefined;
			await awaitCacheKey("debts.get", debtsAmount || undefined);
		}),
});
