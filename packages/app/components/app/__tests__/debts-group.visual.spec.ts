import { mergeTests } from "@playwright/test";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

test("No debts", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: () => [],
	});
	await openUserDebtsScreen(debtUser.id);
	await expectScreenshotWithSchemes("empty.png", {
		locator: debtsGroup,
	});
});

test("Single group", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openUserDebtsScreen(debtUser.id, { awaitDebts: 1 });
	await expectScreenshotWithSchemes("single.png", {
		locator: debtsGroup,
	});
});

test("Multiple groups with different directions", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const AMOUNT = 20;
	const { debtUser } = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: AMOUNT }),
	});
	await openUserDebtsScreen(debtUser.id, { awaitDebts: AMOUNT });
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});
