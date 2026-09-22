import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

test("No debts", async ({
	openPeerDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generateDebts: () => [],
	});
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id);
	await expectScreenshotWithSchemes("empty.png", {
		locator: debtsGroup,
	});
});

test("Single group", async ({
	openPeerDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id, { awaitDebts: 1 });
	await expectScreenshotWithSchemes("single.png", {
		locator: debtsGroup,
	});
});

test("Multiple groups with different directions", async ({
	openPeerDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
	cookieManager,
	consoleManager,
}) => {
	const AMOUNT = 20;
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: AMOUNT }),
	});
	await cookieManager.addCookie(LIMIT_STORE_NAME, AMOUNT + 1);
	assert.ok(firstPeer);
	// TODO: fix this ignored message
	consoleManager.ignore(
		'Select: Keys "21" passed to "selectedKeys" are not present in the collection.',
	);
	await openPeerDebtsScreen(firstPeer.id, { awaitDebts: AMOUNT });
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});
