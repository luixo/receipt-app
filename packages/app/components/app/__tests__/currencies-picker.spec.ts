import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import type { CurrencyCode } from "~app/utils/currency";
import { expect } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";
import { CURRENCY_CODES } from "~utils/currency-data";

import { test as currenciesPickerFixture } from "./currencies-picker.utils";

const test = mergeTests(addDebtTest, currenciesPickerFixture);

// Three distinct, guaranteed-real codes in a fixed count order, so the
// "top currencies" section is deterministic regardless of random faker data.
const TOP_CODES: CurrencyCode[] = ["USD", "EUR", "GBP"];

const mockTopCurrencies = (api: ExtractFixture<typeof addDebtTest>["api"]) => {
	// Overrides `mockBase`'s random top currencies - must run after it, since
	// the most recently registered `mockFirst` handler wins.
	api.mockFirst(
		"currency.top",
		TOP_CODES.map((currencyCode, index) => ({
			currencyCode,
			count: TOP_CODES.length - index,
		})),
	);
};

test("Lists top currencies before a divider, then the rest", async ({
	api,
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
	currencyButton,
}) => {
	await mockBase();
	mockTopCurrencies(api);
	await page.goto("/debts/add");

	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
	await expect(currencyButton()).toHaveCount(CURRENCY_CODES.length);

	const { before, after } = await currenciesPicker.evaluate((root) => {
		const items = Array.from(
			root.querySelectorAll(
				'[data-testid="currency-button"], [role="separator"]',
			),
		);
		const dividerIndex = items.findIndex(
			(item) => item.getAttribute("role") === "separator",
		);
		return {
			before: items
				.slice(0, dividerIndex)
				.map((item) => item.getAttribute("title")),
			after: items
				.slice(dividerIndex + 1)
				.map((item) => item.getAttribute("title")),
		};
	});

	expect(new Set(before)).toStrictEqual(new Set(TOP_CODES));
	expect(before.length + after.length).toBe(CURRENCY_CODES.length);
});

test("Highlights the selected currency and swaps it on click", async ({
	api,
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
	currencyButton,
	expectCurrency,
}) => {
	await mockBase();
	mockTopCurrencies(api);
	await page.goto("/debts/add");

	// Auto-loaded selection is the highest-count top currency.
	await expectCurrency(currencyInput, "USD");

	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
	await expect(currencyButton("USD")).toHaveClass(/bg-success\/20/);
	await expect(currencyButton("EUR")).toHaveClass(/bg-primary\/20/);

	await currencyButton("EUR").click();
	await expect(currenciesPicker).toBeHidden();
	await expectCurrency(currencyInput, "EUR");

	await currencyInput.click();
	await expect(currencyButton("EUR")).toHaveClass(/bg-success\/20/);
	await expect(currencyButton("USD")).toHaveClass(/bg-primary\/20/);
});
