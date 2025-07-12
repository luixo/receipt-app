import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as dateInputTest } from "~app/components/__tests__/date-input.utils";
import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as currencyInputTest } from "~app/components/app/__tests__/currency-input.utils";
import { expect } from "~tests/frontend/fixtures";
import { add, getNow, subtract } from "~utils/date";

import { test as localTest } from "./utils";

const test = mergeTests(
	localTest,
	currencyInputTest,
	currenciesPickerTest,
	dateInputTest,
);

test("On load", async ({
	page,
	addButton,
	snapshotQueries,
	awaitCacheKey,
	mockBase,
	dateInput,
	currencyInput,
	expectDate,
	expectCurrency,
}) => {
	const { topCurrencies } = await mockBase();
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const topCurrency = topCurrencies.sort((a, b) => a.count - b.count)[0]!;

	await snapshotQueries(async () => {
		await page.goto("/receipts/add");
		await awaitCacheKey("currency.top");
	});
	await expect(page).toHaveTitle("RA - Add receipt");
	await expect(addButton).toBeDisabled();
	await expectDate(
		dateInput,
		// We use negative timezone offset in tests hence in our browser
		// its yesterday (compared to mocked date) at the moment
		subtract.plainDate(getNow.plainDate(), { days: 1 }),
	);
	await expectCurrency(currencyInput, topCurrency.currencyCode);
});

test.describe("'Add' button disabled", () => {
	test("On invalid name input", async ({
		page,
		mockBase,
		addButton,
		nameInput,
	}) => {
		await mockBase();

		await page.goto("/receipts/add");
		await nameInput.fill("x");
		await expect(addButton).toBeDisabled();
		await nameInput.fill("xx");
		await expect(addButton).toBeEnabled();
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
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	awaitCacheKey,
	faker,
	fillDate,
	fillCurrency,
}) => {
	await mockBase();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receipts.add" error`,
		});
	});

	const receiptName = faker.lorem.words();
	const receiptId = faker.string.uuid();

	await page.goto("/receipts/add");
	await nameInput.fill(receiptName);
	await fillDate(dateInput, add.plainDate(getNow.plainDate(), { months: 1 }));
	await fillCurrency(currencyInput, "USD");

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("receipts.add", { errored: 1 });
			await verifyToastTexts(`Mock "receipts.add" error`);
		},
		{ name: "error" },
	);
	await expect(page).toHaveURL("/receipts/add");

	const createPause = api.createPause();
	api.mockFirst("receipts.add", async () => {
		await createPause.promise;
		return {
			id: receiptId,
			createdAt: getNow.zonedDateTime(),
			participants: [],
			items: [],
			payers: [],
		};
	});
	const buttonWithLoader = withLoader(addButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await addButton.click();
			await verifyToastTexts(`Adding receipt "${receiptName}"..`);
		},
		{ name: "loading" },
	);
	await expect(addButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	const inputs = await page.locator("input").all();
	for (const input of inputs) {
		// eslint-disable-next-line no-await-in-loop
		await expect(input).toBeDisabled();
	}

	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("receipts.add");
			await verifyToastTexts(`Receipt "${receiptName}" added`);
		},
		{ name: "success", blacklistKeys: "users.get" },
	);
	await expect(page).toHaveURL(`/receipts/${receiptId}`);
});
