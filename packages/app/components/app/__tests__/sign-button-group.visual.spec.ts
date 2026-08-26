import { mergeTests } from "@playwright/test";

import { test as debtTest } from "~app/features/debt/__tests__/utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as signButtonGroupFixture } from "./sign-button-group.utils";

const test = mergeTests(debtTest, signButtonGroupFixture);

const generatePositiveDebt: typeof defaultGenerateDebts = (opts) =>
	defaultGenerateDebts(opts).map((generatedDebt) => ({
		...generatedDebt,
		amount: Math.abs(generatedDebt.amount),
	}));

const generateNegativeDebt: typeof defaultGenerateDebts = (opts) =>
	defaultGenerateDebts(opts).map((generatedDebt) => ({
		...generatedDebt,
		amount: -Math.abs(generatedDebt.amount),
	}));

test("Positive direction", async ({
	mockDebt,
	openDebtScreen,
	signButtonGroup,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({ generateDebts: generatePositiveDebt });
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("positive.png", {
		locator: signButtonGroup,
	});
});

test("Negative direction", async ({
	mockDebt,
	openDebtScreen,
	signButtonGroup,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({ generateDebts: generateNegativeDebt });
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("negative.png", {
		locator: signButtonGroup,
	});
});

test("Loading state", async ({
	api,
	mockDebt,
	openDebtScreen,
	signButtonGroup,
	signButtonNegative,
	clearToasts,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({ generateDebts: generatePositiveDebt });
	await openDebtScreen(debt.id);
	const updatePause = api.createPause();
	api.mockFirst("debts.update", async () => {
		await updatePause.promise;
		return { updatedAt: debt.updatedAt, reverseUpdated: false };
	});
	await signButtonNegative.click();
	await clearToasts();
	await expectScreenshotWithSchemes("loading.png", {
		locator: signButtonGroup,
	});
	updatePause.resolve();
});
