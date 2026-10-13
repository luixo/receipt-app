import { expect, mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils.ts";

import { test as currenciesPickerTest } from "./currencies-picker.utils";

const test = mergeTests(addDebtTest, currenciesPickerTest);

test("Currency modal open", async ({
	api,
	page,
	mockBase,
	expectScreenshotWithSchemes,
	currencyInput,
	currenciesPicker,
}) => {
	await mockBase();
	api.mockFirst("currency.top", { items: [] });
	await page.navigate({ to: "/debts/add" });
	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
	await expectScreenshotWithSchemes("modal.png", {
		locator: currenciesPicker,
		fullPage: true,
		pixelsPreset: "surface",
		shift: 1,
	});
});
