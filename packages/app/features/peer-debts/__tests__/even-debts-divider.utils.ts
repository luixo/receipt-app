import type { Locator } from "@playwright/test";
import assert from "node:assert";

import type { CurrencyCode } from "#app/utils/currency.ts";
import type { GenerateDebts } from "#tests/frontend/generators/debts.ts";
import { defaultGenerateDebts } from "#tests/frontend/generators/debts.ts";

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
					(debt, index) => {
						const previousDebt = debts[debts.length - index - 1];
						assert.ok(previousDebt);
						return {
							...debt,
							currencyCode: previousDebt.currencyCode,
							amount: previousDebt.amount,
						};
					},
				),
		),
});
