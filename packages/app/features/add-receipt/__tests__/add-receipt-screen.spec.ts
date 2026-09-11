import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as currencyInputTest } from "~app/components/app/__tests__/currency-input.utils";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { add, formatters, getNow, serialize, subtract } from "~utils/date";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, currencyInputTest, currenciesPickerTest);

test("On load", async ({
	page,
	addButton,
	snapshotQueries,
	awaitCacheKey,
	mockBase,
	dateInput,
	currencyInput,
	expectCurrency,
}) => {
	const { topCurrencies } = await mockBase();
	const [topCurrency] = topCurrencies.toSorted((a, b) => a.count - b.count);
	assert.ok(topCurrency);

	await snapshotQueries(async () => {
		await page.navigate({ to: "/receipts/add" });
		await awaitCacheKey("currency.top");
	});
	await expect(page).toHaveTitle("RA - Add receipt");
	await expect(addButton).toBeDisabled();
	await expect(dateInput).toHaveValue(
		// We use negative timezone offset in tests hence in our browser
		// its yesterday (compared to mocked date) at the moment
		formatters.plainDate(
			subtract.plainDate(getNow.plainDate(), { days: 1 }),
			localSettings.locale,
		),
	);
	await expectCurrency(currencyInput, topCurrency.currencyCode);
});

test.describe("'Add' button disabled", () => {
	test("On invalid name input", async ({
		mockBase,
		addButton,
		nameInput,
		page,
	}) => {
		await mockBase();

		await page.navigate({ to: "/receipts/add" });
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
	fillCurrency,
}) => {
	const { user: selfUser } = await mockBase();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receipts.add" error`,
		});
	});

	const receiptName = faker.lorem.words();
	const receiptId = faker.string.uuid();
	const receiptDate = add.plainDate(getNow.plainDate(), { months: 1 });
	const receiptCurrencyCode = "USD";

	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(receiptName);
	await dateInput.fill(serialize(receiptDate));
	await fillCurrency(currencyInput, receiptCurrencyCode);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("receipts.add", { error: 1 });
			await verifyToastTexts(`Mock "receipts.add" error`);
		},
		{ name: "error" },
	);
	await page.expectUrl({ to: "/receipts/add" });

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
		await expect(input).toBeDisabled();
	}

	api.mockFirst("receipts.get", () => ({
		id: receiptId,
		debts: { direction: "outcoming", debts: [] },
		name: receiptName,
		currencyCode: receiptCurrencyCode,
		issued: receiptDate,
		createdAt: getNow.zonedDateTime(),
		participants: [],
		items: [],
		payers: [],
		ownerUserId: selfUser.id,
		selfUserId: selfUser.id,
	}));
	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("receipts.add");
			await verifyToastTexts(`Receipt "${receiptName}" added`);
		},
		{ name: "success", blacklistKeys: "users.get" },
	);
	await page.expectUrl({ to: "/receipts/$id", params: { id: receiptId } });
});
