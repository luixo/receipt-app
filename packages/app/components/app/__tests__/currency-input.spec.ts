import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as currenciesPickerFixture } from "./currencies-picker.utils";

const test = mergeTests(addDebtTest, currenciesPickerFixture);

test("Shows a pick button while loading, then auto-selects a top currency", async ({
	page,
	api,
	mockBase,
	currencyInput,
}) => {
	await mockBase();
	const currencyListPause = api.createPause();
	api.mockFirst("currency.getList", async ({ next }) => {
		await currencyListPause.promise;
		return next();
	});

	await page.goto("/debts/add");
	const pickButton = page.getByRole("button", { name: "Pick currency" });
	await expect(pickButton).toBeVisible();
	await expect(currencyInput).not.toBeAttached();

	currencyListPause.resolve();
	await expect(currencyInput).toBeVisible();
	await expect(pickButton).not.toBeAttached();
});

test("Opens the currencies picker when the input is pressed", async ({
	page,
	mockBase,
	currencyInput,
	currenciesPicker,
}) => {
	await mockBase();
	await page.goto("/debts/add");

	await expect(currencyInput).toBeVisible();
	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
});
