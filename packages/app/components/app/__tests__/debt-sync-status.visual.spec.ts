import { mergeTests } from "@playwright/test";
import { isNonNullish } from "remeda";

import { test as debtTest } from "#app/features/debt/__tests__/utils.ts";
import {
	defaultGenerateDebts,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "#tests/frontend/generators/debts.ts";

import { test as debtSyncStatusFixture } from "./debt-sync-status.utils";

const test = mergeTests(debtTest, debtSyncStatusFixture);

test("Out of sync (push)", async ({
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	skip,
	mockConnectedAccount,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirNonExistent).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("out-of-sync-push.png", {
		locator: debtSyncStatus,
	});
});

test("In sync", async ({
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	mockConnectedAccount,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirSynced).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("in-sync.png", {
		locator: debtSyncStatus,
	});
});

test("Out of sync (incoming)", async ({
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	mockConnectedAccount,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirDesynced).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("out-of-sync-incoming.png", {
		locator: debtSyncStatus,
	});
});
