import { expect, mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as dateInputTest } from "~app/components/__tests__/date-input.utils";
import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as currencyInputTest } from "~app/components/app/__tests__/currency-input.utils";
import { MONTH } from "~utils/time";

import { test as localTest } from "./utils";

const test = mergeTests(
	localTest,
	currencyInputTest,
	currenciesPickerTest,
	dateInputTest,
);

test("Form", async ({
	mockBase,
	page,
	nameInput,
	dateInput,
	currencyInput,
	expectScreenshotWithSchemes,
	fillDate,
	fillCurrency,
}) => {
	mockBase();
	await page.goto("/receipts/add");
	await expect(page.locator("h1")).toHaveText("Add receipt");
	await expectScreenshotWithSchemes("empty.png");
	await nameInput.fill("Receipt name");
	await fillDate(dateInput, new Date().valueOf() + MONTH);
	await fillCurrency(currencyInput, "USD");
	await expectScreenshotWithSchemes("filled.png");
});

test("Errors in form", async ({
	mockBase,
	page,
	nameInput,
	nameInputWrapper,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	mockBase();
	await page.goto("/receipts/add");
	await nameInput.fill("x");
	await expectScreenshotWithSchemes("fill-name-error.png", {
		locator: nameInputWrapper,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#d8e9fd" : "#001125",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("'receipts.add' mutation", async ({
	page,
	api,
	mockBase,
	addButton,
	nameInput,
	dateInput,
	currencyInput,
	faker,
	fillDate,
	fillCurrency,
	expectScreenshotWithSchemes,
	clearToasts,
}) => {
	mockBase();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receipts.add" error`,
		});
	});

	await page.goto("/receipts/add");
	await nameInput.fill(faker.lorem.words());
	await fillDate(dateInput, new Date().valueOf() + MONTH);
	await fillCurrency(currencyInput, "USD");
	const createPause = api.createPause();
	api.mockFirst("receipts.add", async () => {
		await createPause.promise;
		return {
			id: "anything",
			createdAt: new Date(),
			items: [],
			participants: [],
			payers: [],
		};
	});
	await addButton.click();
	await clearToasts();
	await expectScreenshotWithSchemes("mutation-loading.png");
});
