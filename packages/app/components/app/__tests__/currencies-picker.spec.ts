import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import { getCurrencyDescription } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { CURRENCY_CODES } from "~utils/currency-data";

import { test as currenciesPickerFixture } from "./currencies-picker.utils";

const regularCurrenciesSkeletons = 10;
const topCurrenciesSkeletons = 3;

const test = mergeTests(addDebtTest, currenciesPickerFixture);

test("Lists top currencies", async ({
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
	currencyButton,
	divider,
}) => {
	const { topCurrencies } = await mockBase();
	await page.navigate({ to: "/debts/add" });

	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
	await expect(currencyButton()).toHaveCount(CURRENCY_CODES.length);

	const topCurrenciesTexts = await currencyButton()
		.and(divider.locator("xpath=preceding-sibling::*"))
		.allTextContents();
	const restCurrenciesTexts = await currencyButton()
		.and(divider.locator("xpath=following-sibling::*"))
		.allTextContents();

	const topCurrencyCodes = topCurrencies.map(
		({ currencyCode }) => currencyCode,
	);
	const restCurrencyCodes = CURRENCY_CODES.filter(
		(currencyCode) => !topCurrencyCodes.includes(currencyCode),
	);
	expect(topCurrenciesTexts).toStrictEqual(
		topCurrencyCodes.map((currencyCode) =>
			getCurrencyDescription(localSettings.locale, currencyCode),
		),
	);
	expect(restCurrenciesTexts).toStrictEqual(
		restCurrencyCodes.map((currencyCode) =>
			getCurrencyDescription(localSettings.locale, currencyCode),
		),
	);
});

test("Highlights the selected currency and swaps it on click", async ({
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
	currencyButton,
	expectCurrency,
}) => {
	const { topCurrencies } = await mockBase();
	await page.navigate({ to: "/debts/add" });
	const [firstCurrency, secondCurrency] = topCurrencies;
	assert.ok(firstCurrency);
	assert.ok(secondCurrency);

	// Auto-loaded selection is the highest-count top currency.
	await expectCurrency(currencyInput, firstCurrency.currencyCode);

	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();

	await currencyButton(secondCurrency.currencyCode).click();
	await expect(currenciesPicker).toBeHidden();
	await expectCurrency(currencyInput, secondCurrency.currencyCode);
});

test("Shows picker skeleton while currencies are still loading", async ({
	page,
	api,
	mockBase,
	currenciesPicker,
	currencyInput,
	skeleton,
}) => {
	await mockBase();
	const pause = api.createPause();
	api.mockFirst("currency.getList", async ({ next }) => {
		await pause.promise;
		return next();
	});
	await page.navigate({ to: "/debts/add" });
	await page.getByRole("button", { name: "Pick currency" }).click();
	await expect(currenciesPicker).toBeVisible();
	await expect(
		currenciesPicker.getByRole("button").filter({ has: skeleton }),
	).toHaveCount(topCurrenciesSkeletons + regularCurrenciesSkeletons);
	pause.resolve();
	await expect(currencyInput).toBeVisible();
	await expect(currenciesPicker).toBeHidden();
});
