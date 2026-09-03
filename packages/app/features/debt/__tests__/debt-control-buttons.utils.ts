import type { Locator } from "@playwright/test";

import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { Temporal } from "~utils/date";

import { test as originalTest } from "./utils";

export const generateDebtWithUpdated =
	(update: (updatedAt: Temporal.ZonedDateTime) => Temporal.ZonedDateTime) =>
	(opts: Parameters<GenerateDebts>[0]) =>
		defaultGenerateDebts(opts).map((generatedDebt) => ({
			...generatedDebt,
			their: {
				updatedAt: update(generatedDebt.updatedAt),
				currencyCode: generatedDebt.currencyCode,
				timestamp: generatedDebt.timestamp,
				amount: generatedDebt.amount + 100,
			},
		}));

type Fixtures = {
	acceptIntentionButton: Locator;
	acceptIntentionDialog: Locator;
	acceptIntentionDialogYesButton: Locator;
	acceptIntentionDialogNoButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	acceptIntentionButton: ({ page }, use) =>
		use(page.getByTestId("sync-button")),
	acceptIntentionDialog: ({ modal }, use) =>
		use(modal("Update debt to a counterparty's version")),
	acceptIntentionDialogYesButton: ({ acceptIntentionDialog }, use) =>
		use(acceptIntentionDialog.getByRole("button", { name: "Yes" })),
	acceptIntentionDialogNoButton: ({ acceptIntentionDialog }, use) =>
		use(acceptIntentionDialog.getByRole("button", { name: "No" })),
});
