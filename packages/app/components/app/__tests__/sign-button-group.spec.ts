import { mergeTests } from "@playwright/test";

import { test as debtTest } from "~app/features/debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { wait } from "~utils/promise";

import { test as signButtonGroupFixture } from "./sign-button-group.utils";

const test = mergeTests(debtTest, signButtonGroupFixture);

test("Clicking the button", async ({
	mockDebt,
	openDebtScreen,
	signButtonPositive,
	signButtonNegative,
	snapshotQueries,
	awaitCacheKey,
}) => {
	const { debt } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generatedDebt) => ({
				...generatedDebt,
				amount: Math.abs(generatedDebt.amount),
			})),
	});
	await openDebtScreen(debt.id);
	await expect(signButtonPositive).toBeVisible();
	await expect(signButtonNegative).toBeVisible();

	await snapshotQueries(async () => {
		await signButtonPositive.click();
		// Debt is already positive - clicking the same direction should be a no-op
		await wait(300);
	});
	await snapshotQueries(async () => {
		await signButtonNegative.click();
		await awaitCacheKey("debts.update");
	});
});

test("Loading state", async ({
	api,
	mockDebt,
	openDebtScreen,
	signButtonPositive,
	signButtonNegative,
	awaitCacheKey,
	withLoader,
}) => {
	const { debt } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generatedDebt) => ({
				...generatedDebt,
				amount: Math.abs(generatedDebt.amount),
			})),
	});
	await openDebtScreen(debt.id);

	const updatePause = api.createPause();
	api.mockFirst("debts.update", async () => {
		await updatePause.promise;
		return { updatedAt: debt.updatedAt, reverseUpdated: false };
	});
	await signButtonNegative.click();
	await expect(signButtonPositive).toBeDisabled();
	await expect(signButtonNegative).toBeDisabled();
	await expect(withLoader(signButtonNegative)).toBeVisible();

	updatePause.resolve();
	await awaitCacheKey("debts.update");
	await expect(signButtonPositive).toBeEnabled();
	await expect(signButtonNegative).toBeEnabled();
});
