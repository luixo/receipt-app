import { test } from "~app/features/debts-exchange/__tests__/utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

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
