import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { SETTINGS_COOKIE_NAME } from "~app/utils/cookie/settings";
import { expect } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture);

test.describe("Wrapper component", () => {
	test("'debts.getIdsByUser' pending / error", async ({
		api,
		errorMessage,
		loader,
		user: userSelector,
		mockBase,
		openDebtsExchangeScreen,
		exchangeAllToOneButton,
		exchangeSpecificButton,
		awaitCacheKey,
	}) => {
		const { user } = mockBase();
		const userDebtsIdsPause = api.createPause();
		api.mock("debts.getIdsByUser", async () => {
			await userDebtsIdsPause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.getIdsByUser" error`,
			});
		});
		await openDebtsExchangeScreen(user.id, { awaitCache: false });
		await awaitCacheKey("users.get");

		await expect(loader).toBeVisible();
		await expect(userSelector).toBeVisible();
		await expect(exchangeAllToOneButton).not.toBeAttached();
		await expect(exchangeSpecificButton).not.toBeAttached();

		userDebtsIdsPause.resolve();
		await expect(errorMessage(`Mock "debts.getIdsByUser" error`)).toBeVisible();
		await expect(exchangeAllToOneButton).not.toBeAttached();
		await expect(exchangeSpecificButton).not.toBeAttached();
	});
});

test.describe("Header", () => {
	test("User name in a title", async ({
		api,
		mockDebts,
		openDebtsExchangeScreen,
		awaitCacheKey,
		page,
	}) => {
		const { user } = mockDebts();
		const userPause = api.createPause();
		api.mock("users.get", async ({ next }) => {
			await userPause.promise;
			return next();
		});
		await openDebtsExchangeScreen(user.id, { awaitCache: false });
		await expect(page).toHaveTitle("RA - ...'s debts");
		userPause.resolve();
		await awaitCacheKey("users.get");
		await expect(page).toHaveTitle(`RA - ${user.name}'s debts`);
	});

	test("Back button", async ({
		mockDebts,
		openDebtsExchangeScreen,
		backLink,
		page,
	}) => {
		const { user } = mockDebts();
		await openDebtsExchangeScreen(user.id);
		await backLink.click();
		await expect(page).toHaveURL(`/debts/user/${user.id}`);
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
		const { user, debts } = mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_COOKIE_NAME, {
			showResolvedDebts: true,
		});
		await openDebtsExchangeScreen(user.id, { awaitDebts: debts.length });
		await expect(debtsGroupElement).toHaveCount(2);
	});

	test("Option is false", async ({
		mockDebts,
		openDebtsExchangeScreen,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { user, debts } = mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_COOKIE_NAME, {
			showResolvedDebts: false,
		});
		await openDebtsExchangeScreen(user.id, { awaitDebts: debts.length });
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
	const { user } = mockDebts();
	await openDebtsExchangeScreen(user.id);
	api.mock("currency.top", []);
	await exchangeAllToOneButton.click();
	await expect(page).toHaveURL(`/debts/user/${user.id}/exchange/all`);
});

test("Exchange to specific currency button", async ({
	mockDebts,
	openDebtsExchangeScreen,
	exchangeSpecificButton,
}) => {
	const { user } = mockDebts();
	await openDebtsExchangeScreen(user.id);
	await expect(exchangeSpecificButton).toBeDisabled();
	// The specific page is not yet implemented
	// await exchangeSpecificButton.click();
	// await expect(page).toHaveURL(`/debts/user/${user.id}/exchange/specific`);
});
