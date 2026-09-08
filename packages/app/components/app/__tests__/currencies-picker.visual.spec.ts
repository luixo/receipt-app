import { expect, mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils.ts";

import { test as currenciesPickerTest } from "./currencies-picker.utils";

const test = mergeTests(addDebtTest, currenciesPickerTest);

test("Currency modal open", async ({
	api,
	openAddDebtScreen,
	mockBase,
	expectScreenshotWithSchemes,
	currencyInput,
	currenciesPicker,
}) => {
	await mockBase();
	api.mockFirst("currency.top", { items: [] });
	await openAddDebtScreen();
	await currencyInput.click();
	await expect(currenciesPicker).toBeVisible();
	await expectScreenshotWithSchemes("modal.png", {
		locator: currenciesPicker,
		fullPage: true,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});
