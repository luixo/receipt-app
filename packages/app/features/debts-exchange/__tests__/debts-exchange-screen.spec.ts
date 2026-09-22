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

const generateDebtsWithEmpty: GenerateDebts = (opts) => {
	const [firstDebt, secondDebt, thirdDebt] = defaultGenerateDebts({
		...opts,
		amount: 3,
	});
	assert.ok(firstDebt);
	assert.ok(secondDebt);
	assert.ok(thirdDebt);
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

test.describe("Wrapper component", () => {
	test("'debts.getByPeerPaged' error", async ({
		api,
		errorMessage,
		mockBase,
		openDebtsExchangeScreen,
		debtsGroup,
		awaitCacheKey,
		consoleManager,
	}) => {
		const { debtPeer } = await mockBase();
		api.mockFirst("debts.getAllPeer", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.getAllPeer" error`,
			});
		});
		consoleManager.ignore(/Mock "debts.getAllPeer" error/);
		await openDebtsExchangeScreen(debtPeer.id, { awaitCache: false });
		await awaitCacheKey("peers.get");

		await expect(errorMessage(`Mock "debts.getAllPeer" error`)).toBeVisible();
		await expect(debtsGroup).not.toBeAttached();
	});
});

test.describe("Header", () => {
	test("Title", async ({ mockDebts, openDebtsExchangeScreen, page }) => {
		const { debtPeer } = await mockDebts();
		await openDebtsExchangeScreen(debtPeer.id);
		await expect(page).toHaveTitle("RA - Exchange peer debts");
	});

	test("Back button", async ({
		mockDebts,
		openDebtsExchangeScreen,
		backLink,
		page,
		api,
	}) => {
		const { debtPeer } = await mockDebts();
		api.mockFirst("debts.getByPeerPaged", { items: [], count: 0, cursor: 0 });
		await openDebtsExchangeScreen(debtPeer.id);
		await backLink.click();
		await page.expectUrl({
			to: "/debts/peer/$id",
			params: { id: debtPeer.id },
		});
	});
});

test.describe("Showed debts depending on 'show resolved debts' option", () => {
	test("Option is true", async ({
		mockDebts,
		openDebtsExchangeScreen,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtPeer } = await mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: true,
		});
		await openDebtsExchangeScreen(debtPeer.id);
		await expect(debtsGroupElement).toHaveCount(2);
	});

	test("Option is false", async ({
		mockDebts,
		openDebtsExchangeScreen,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtPeer } = await mockDebts({
			generateDebts: generateDebtsWithEmpty,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: false,
		});
		await openDebtsExchangeScreen(debtPeer.id);
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
	const { debtPeer } = await mockDebts();
	await openDebtsExchangeScreen(debtPeer.id);
	api.mockFirst("currency.top", { items: [] });
	await exchangeAllToOneButton.click();
	await page.expectUrl({
		to: "/debts/peer/$id/exchange/all",
		params: { id: debtPeer.id },
	});
});

test("Exchange to specific currency button", async ({
	mockDebts,
	openDebtsExchangeScreen,
	exchangeSpecificButton,
}) => {
	const { debtPeer } = await mockDebts();
	await openDebtsExchangeScreen(debtPeer.id);
	await expect(exchangeSpecificButton).toBeDisabled();
	// The specific page is not yet implemented
	// await exchangeSpecificButton.click();
	// await page.expectUrl({
	// 	to: "/debts/peer/$id/exchange/specific",
	// 	params: { id: debtPeer.id },
	// });
});
