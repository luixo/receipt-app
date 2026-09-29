import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "#app/features/add-debt/__tests__/utils.ts";
import { expect } from "#tests/frontend/fixtures.ts";

import { test as currencyInputFixture } from "./currency-input.utils";

const test = mergeTests(addDebtTest, currencyInputFixture);

test("Selected currency input", async ({
	page,
	mockBase,
	currencyInput,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	await page.navigate({ to: "/debts/add" });
	await expect(currencyInput).toBeVisible();
	await expectScreenshotWithSchemes("selected.png", {
		locator: page.locator('[data-slot="base"]', { has: currencyInput }),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				location: [10, 10],
				rgb: colorMode === "light" ? "#f4f4f5" : "#27272a",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Pick currency button while loading", async ({
	page,
	api,
	mockBase,
	pickCurrencyButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	const pause = api.createPause();
	api.mockFirst("currency.getList", async ({ next }) => {
		await pause.promise;
		return next();
	});
	await page.navigate({ to: "/debts/add" });
	await expect(pickCurrencyButton).toBeVisible();
	await expectScreenshotWithSchemes("loading.png", {
		locator: pickCurrencyButton,
	});
});
