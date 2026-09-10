import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { getNow } from "~utils/date";

import { getPlannedDebtsAmount, test } from "./utils";

test.describe("Form", () => {
	test("Form", async ({
		page,
		mockDebts,
		expectScreenshotWithSchemes,
		plannedDebtsForm,
	}) => {
		const { debtUser, debts } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});
		await expectScreenshotWithSchemes("planned-debts.png", {
			locator: plannedDebtsForm,
		});
	});

	test("Skeleton", async ({
		api,
		mockDebts,
		page,
		expectScreenshotWithSchemes,
		currencyGroupButtonByCode,
		skeleton,
		plannedDebtsFormSkeleton,
	}) => {
		const { debtUser, debts } = await mockDebts();
		const createPause = api.createPause();
		api.mockFirst("currency.rates", async ({ next }) => {
			await createPause.promise;
			return next();
		});
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		const fromDebt = debts.find((debt) => debt.sum !== 0);
		assert.ok(fromDebt);
		await currencyGroupButtonByCode(fromDebt.currencyCode).click();
		await expect(skeleton.first()).toBeVisible();
		await expectScreenshotWithSchemes("planned-debts-skeleton.png", {
			locator: plannedDebtsFormSkeleton,
		});
	});

	test("Field error", async ({
		page,
		mockDebts,
		expectScreenshotWithSchemes,
		rateInput,
		rateField,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-smallest");
		const { debtUser, debts } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		const rowDebt = debts.find(
			(debt) => debt.sum !== 0 && debt.currencyCode !== fromCurrencyCode,
		);
		assert.ok(rowDebt);
		await rateInput(rowDebt.currencyCode).fill("0");
		await rateInput(rowDebt.currencyCode).press("Tab");

		await expectScreenshotWithSchemes("planned-debts-field-error.png", {
			locator: rateField(rowDebt.currencyCode),
		});
	});
});

test.describe("Mutation", () => {
	test("Loading", async ({
		api,
		page,
		mockDebts,
		expectScreenshotWithSchemes,
		sendButton,
		clearToasts,
		awaitCacheKey,
		plannedDebtsForm,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		const { debtUser, debts } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		const createPause = api.createPause();
		api.mockFirst("debts.add", async () => {
			await createPause.promise;
			return {
				id: "test-debt-id",
				updatedAt: getNow.zonedDateTime(),
				reverseAccepted: false,
			};
		});
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		await sendButton.click();
		await awaitCacheKey("debts.add", {
			pending: getPlannedDebtsAmount(debts, fromCurrencyCode),
		});
		await clearToasts(1);

		await expectScreenshotWithSchemes("planned-debts-loading.png", {
			locator: plannedDebtsForm,
		});
	});

	test("Error", async ({
		api,
		page,
		mockDebts,
		expectScreenshotWithSchemes,
		sendButton,
		awaitCacheKey,
		verifyToastTexts,
		consoleManager,
		plannedDebtsForm,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		const { debtUser, debts } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		const mockErrorMessage = `Mock "debts.add" error`;
		api.mockFirst("debts.add", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		consoleManager.ignore(mockErrorMessage);
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		await sendButton.click();
		await awaitCacheKey("debts.add", {
			error: getPlannedDebtsAmount(debts, fromCurrencyCode),
		});
		await verifyToastTexts(mockErrorMessage);

		await expectScreenshotWithSchemes("planned-debts-error.png", {
			locator: plannedDebtsForm,
		});
	});
});
