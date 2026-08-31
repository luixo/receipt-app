import type { Locator } from "@playwright/test";

import type { CurrencyCode } from "~app/utils/currency";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as originalTest } from "./utils";

type Fixtures = {
	evenDebtsDivider: Locator;
	getGenerateDebts: (
		debts: {
			currencyCode: CurrencyCode;
			amount: number;
		}[],
	) => GenerateDebts;
};

export const test = originalTest.extend<Fixtures>({
	evenDebtsDivider: ({ page }, use) =>
		use(page.getByTestId("even-debts-divider")),
	getGenerateDebts: ({}, use) =>
		use(
			(debts) => (opts) =>
				defaultGenerateDebts({ ...opts, amount: debts.length }).map(
					(debt, index) => ({
						...debt,
						/* oxlint-disable typescript/no-non-null-assertion */
						currencyCode: debts[debts.length - index - 1]!.currencyCode,
						amount: debts[debts.length - index - 1]!.amount,
						/* oxlint-enable typescript/no-non-null-assertion */
					}),
				),
		),
});
