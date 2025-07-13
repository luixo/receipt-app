import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { expect } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture);

test.describe("Wrapper component", () => {
	test("'debts.getByUserPaged' error", async ({
		api,
		errorMessage,
		mockBase,
		openDebtsExchangeScreen,
		debtsGroup,
		awaitCacheKey,
		consoleManager,
	}) => {
		const { debtUser } = await mockBase();
		api.mockFirst("debts.getAllUser", async () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.getAllUser" error`,
			});
		});
		consoleManager.ignore(/Mock "debts.getAllUser" error/);
		await openDebtsExchangeScreen(debtUser.id, { awaitCache: false });
		await awaitCacheKey("users.get");

		await expect(errorMessage(`Mock "debts.getAllUser" error`)).toBeVisible();
		await expect(debtsGroup).not.toBeAttached();
	});
});

test.describe("Header", () => {
	test("Title", async ({ mockDebts, openDebtsExchangeScreen, page }) => {
		const { debtUser } = await mockDebts();
		await openDebtsExchangeScreen(debtUser.id);
		await expect(page).toHaveTitle("RA - Exchange user debts");
	});

	test("Back button", async ({
		mockDebts,
		openDebtsExchangeScreen,
		backLink,
		page,
	}) => {
		const { debtUser } = await mockDebts();
		await openDebtsExchangeScreen(debtUser.id);
		await backLink.click();
		await expect(page).toHaveURL(`/debts/user/${debtUser.id}`);
	});
});

test.describe("Showed debts depending on 'show resolved debts' option", () => {
	const generateDebtsWithEmpty: GenerateDebts = (opts) => {
		const [firstDebt, secondDebt, thirdDebt] = defaultGenerateDebts({
			...opts,
			amount: 3,
		});
		assert(firstDebt);
		assert(secondDebt);
		assert(thirdDebt);
		return [
			{ ...firstDebt, amount: 10 },
			{
				...secondDebt,
				currencyCode: firstDebt.currencyCode,
				amount: -10,
			},
			{
				...thirdDebt,
				currencyCode: firstDebt.currencyCode === "USD" ? "EUR" : "USD",
				amount: 10,
			},
		];
	};

	test("Option is true", async ({
		mockDebts,
		openDebtsExchangeScreen,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtUser } = await mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: true,
		});
		await openDebtsExchangeScreen(debtUser.id);
		await expect(debtsGroupElement).toHaveCount(2);
	});

	test("Option is false", async ({
		mockDebts,
		openDebtsExchangeScreen,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtUser } = await mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: false,
		});
		await openDebtsExchangeScreen(debtUser.id);
		await expect(debtsGroupElement).toHaveCount(1);
	});
});

test("Exchange all to one button", async ({
	api,
	mockDebts,
	openDebtsExchangeScreen,
	exchangeAllToOneButton,
	page,
}) => {
	const { debtUser } = await mockDebts();
	await openDebtsExchangeScreen(debtUser.id);
	api.mockFirst("currency.top", []);
	await exchangeAllToOneButton.click();
	await expect(page).toHaveURL(`/debts/user/${debtUser.id}/exchange/all`);
});

test("Exchange to specific currency button", async ({
	mockDebts,
	openDebtsExchangeScreen,
	exchangeSpecificButton,
}) => {
	const { debtUser } = await mockDebts();
	await openDebtsExchangeScreen(debtUser.id);
	await expect(exchangeSpecificButton).toBeDisabled();
	// The specific page is not yet implemented
	// await exchangeSpecificButton.click();
	// await expect(page).toHaveURL(`/debts/user/${debtUser.id}/exchange/specific`);
});
