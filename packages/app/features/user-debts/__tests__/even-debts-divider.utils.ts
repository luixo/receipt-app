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
	// eslint-disable-next-line no-empty-pattern
	getGenerateDebts: ({}, use) =>
		use(
			(debts) => (opts) =>
				defaultGenerateDebts({ ...opts, amount: debts.length }).map(
					(debt, index) => ({
						...debt,
						/* eslint-disable @typescript-eslint/no-non-null-assertion */
						currencyCode: debts[debts.length - index - 1]!.currencyCode,
						amount: debts[debts.length - index - 1]!.amount,
						/* eslint-enable @typescript-eslint/no-non-null-assertion */
					}),
				),
		),
});
