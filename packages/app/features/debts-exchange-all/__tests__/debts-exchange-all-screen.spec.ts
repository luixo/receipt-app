import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { getCurrencySymbol } from "~app/utils/currency";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";
import { CURRENCY_CODES } from "~utils/currency-data";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture, currenciesPickerTest);

const generateDebtsWithResolvedPair: GenerateDebts = (opts) => {
	const resolvedAmount = opts.faker.number.float({
		min: -10_000,
		max: 10_000,
		multipleOf: 0.01,
	});
	const resolvedCurrencyCode = generateCurrencyCode(opts.faker);
	const nonResolvedCurrencyCode = generateCurrencyCode(opts.faker);
	return defaultGenerateDebts({ ...opts, amount: 4 }).map((debt, index) => {
		if (index < 2) {
			return {
				...debt,
				currencyCode: resolvedCurrencyCode,
				amount: resolvedAmount * (index === 0 ? 1 : -1),
			};
		}
		return { ...debt, currencyCode: nonResolvedCurrencyCode };
	});
};

test.describe("Header", () => {
	test("Title", async ({ mockDebts, page }) => {
		const { debtUser } = await mockDebts();
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});
		await expect(page).toHaveTitle("RA - Exchange all user debts");
	});

	test("Back button", async ({ mockDebts, backLink, page }) => {
		const { debtUser } = await mockDebts();
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});
		await backLink.click();
		await page.expectUrl({
			to: "/debts/user/$id/exchange",
			params: { id: debtUser.id },
		});
	});
});

test.describe("Currencies group", () => {
	test("Shows a currency button for every non-resolved debt and 'Other'", async ({
		mockDebts,
		page,
		currencyGroupButton,
		currencyGroupButtonByCode,
		plannedDebtsForm,
	}) => {
		const { debtUser, debts } = await mockDebts({
			generateDebts: generateDebtsWithResolvedPair,
		});
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		assert.ok(debts[0]);
		await Promise.all(
			debts.slice(1).map(async (debt) => {
				await expect(
					currencyGroupButtonByCode(debt.currencyCode),
				).toBeVisible();
			}),
		);
		// The zero-sum currencies are filtered out
		await expect(
			currencyGroupButtonByCode(debts[0].currencyCode),
		).not.toBeAttached();
		await expect(currencyGroupButton.last()).toHaveText("Other");
		await expect(plannedDebtsForm).not.toBeAttached();
	});

	test("Selecting a currency sets 'from' and shows the planned debts", async ({
		mockDebts,
		currencyGroupButtonByCode,
		plannedDebtsForm,
		awaitCacheKey,
		page,
	}) => {
		const { debtUser, debts } = await mockDebts();
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		const [fromDebt] = debts;
		assert.ok(fromDebt);
		await currencyGroupButtonByCode(fromDebt.currencyCode).click();
		await page.expectUrl({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromDebt.currencyCode },
		});
		await awaitCacheKey("currency.rates", {
			input: {
				from: fromDebt.currencyCode,
				to: debts
					.filter((debt) => debt.currencyCode !== fromDebt.currencyCode)
					.map((debt) => debt.currencyCode),
			},
		});
		await expect(plannedDebtsForm).toBeVisible();
	});

	test("'Other' opens the currencies picker and closes without changes", async ({
		api,
		mockDebts,
		currenciesPicker,
		currencyGroupButton,
		page,
	}) => {
		const { debtUser } = await mockDebts();
		api.mockFirst("currency.top", { items: [] });
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		await currencyGroupButton.filter({ hasText: "Other" }).click();
		await expect(currenciesPicker).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(currenciesPicker).toBeHidden();
		await page.expectUrl({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});
		await expect(currencyGroupButton.last()).toHaveText("Other");
	});

	test("Selecting a currency in the picker selects it in the group", async ({
		api,
		mockDebts,
		currencyGroupButton,
		currencyButton,
		currenciesPicker,
		plannedDebtsForm,
		awaitCacheKey,
		page,
	}) => {
		const { debtUser, debts } = await mockDebts();
		api.mockFirst("currency.top", { items: [] });
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		await currencyGroupButton.filter({ hasText: "Other" }).click();
		await expect(currenciesPicker).toBeVisible();

		const foreignCurrencyCode = CURRENCY_CODES.find((currencyCode) =>
			debts.every((debt) => debt.currencyCode !== currencyCode),
		);
		assert.ok(foreignCurrencyCode);
		await currencyButton(foreignCurrencyCode).click();
		await expect(currenciesPicker).toBeHidden();
		await page.expectUrl({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: foreignCurrencyCode },
		});
		await awaitCacheKey("currency.rates", {
			input: {
				from: foreignCurrencyCode,
				to: debts
					.filter((debt) => debt.sum !== 0)
					.map((debt) => debt.currencyCode),
			},
		});
		await expect(plannedDebtsForm).toBeVisible();
		await expect(currencyGroupButton.last()).toHaveText(
			getCurrencySymbol(localSettings.locale, foreignCurrencyCode),
		);
	});
});

test.describe("Showed debts depending on 'show resolved debts' option", () => {
	test("Option is true", async ({
		page,
		mockDebts,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtUser, debts } = await mockDebts({
			generateDebts: generateDebtsWithResolvedPair,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: true,
		});
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});
		await expect(debtsGroupElement).toHaveCount(
			new Set(debts.map((debt) => debt.currencyCode)).size,
		);
	});

	test("Option is false", async ({
		page,
		mockDebts,
		cookieManager,
		debtsGroupElement,
	}) => {
		const { debtUser, debts } = await mockDebts({
			generateDebts: generateDebtsWithResolvedPair,
		});
		await cookieManager.addCookie(SETTINGS_STORE_NAME, {
			showResolvedDebts: false,
		});
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});
		await expect(debtsGroupElement).toHaveCount(
			debts.filter((debt) => debt.sum !== 0).length,
		);
	});
});
