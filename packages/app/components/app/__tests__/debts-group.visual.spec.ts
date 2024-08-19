import { mergeTests } from "@playwright/test";

import { test as originalTest } from "~app/features/debts-exchange/__tests__/utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localFixture } from "./debts-group.utils";

const test = mergeTests(originalTest, localFixture);

test("No debts", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { user } = mockDebts({
		generateDebts: () => [],
	});
	await openDebtsExchangeScreen(user.id);
	await expectScreenshotWithSchemes("empty.png", {
		locator: debtsGroup,
	});
});

test("Single group", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { user } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openDebtsExchangeScreen(user.id);
	await expectScreenshotWithSchemes("single.png", {
		locator: debtsGroup,
	});
});

test("Multiple groups with different directions", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { user } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 20 }),
	});
	await openDebtsExchangeScreen(user.id);
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});
