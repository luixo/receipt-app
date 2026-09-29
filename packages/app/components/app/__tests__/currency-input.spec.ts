import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as addDebtTest } from "#app/features/add-debt/__tests__/utils.ts";
import { expect } from "#tests/frontend/fixtures.ts";
import { CURRENCY_CODES } from "#utils/currency-data.ts";

import { test as currenciesPickerFixture } from "./currencies-picker.utils";
import { test as currencyInputFixture } from "./currency-input.utils";

const test = mergeTests(
	addDebtTest,
	currencyInputFixture,
	currenciesPickerFixture,
);

test("Shows a pick button while loading, then auto-selects a top currency", async ({
	page,
	api,
	mockBase,
	currencyInput,
	pickCurrencyButton,
}) => {
	await mockBase();
	const currencyListPause = api.createPause();
	api.mockFirst("currency.getList", async ({ next }) => {
		await currencyListPause.promise;
		return next();
	});

	await page.navigate({ to: "/debts/add" });
	await expect(pickCurrencyButton).toBeVisible();
	await expect(currencyInput).not.toBeAttached();

	currencyListPause.resolve();
	await expect(currencyInput).toBeVisible();
	await expect(pickCurrencyButton).not.toBeAttached();
});

test("Opens the currencies picker when the input is pressed", async ({
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
}) => {
	await mockBase();
	await page.navigate({ to: "/debts/add" });

	await expect(currencyInput).toBeVisible();
	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
});

test("Falls back to the first available currency when there are no top currencies", async ({
	page,
	api,
	mockBase,
	currencyInput,
	expectCurrency,
}) => {
	await mockBase();
	api.mockFirst("currency.top", { items: [] });
	await page.navigate({ to: "/debts/add" });
	const [firstCurrency] = CURRENCY_CODES;
	assert.ok(firstCurrency);
	await expect(currencyInput).toBeVisible();
	await expectCurrency(currencyInput, firstCurrency);
});
