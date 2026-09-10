import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

test("No debts", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const {
		users: [firstUser],
	} = await mockDebts({
		generateDebts: () => [],
	});
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id);
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
	const {
		users: [firstUser],
	} = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id, { awaitDebts: 1 });
	await expectScreenshotWithSchemes("single.png", {
		locator: debtsGroup,
	});
});

test("Multiple groups with different directions", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
	cookieManager,
}) => {
	const AMOUNT = 20;
	const {
		users: [firstUser],
	} = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: AMOUNT }),
	});
	await cookieManager.addCookie(LIMIT_STORE_NAME, AMOUNT + 1);
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id, { awaitDebts: AMOUNT });
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});
