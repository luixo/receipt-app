import { mergeTests } from "@playwright/test";
import { isNonNullish } from "remeda";

import { test as debtTest } from "~app/features/debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebts,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/debts";

import { test as debtSyncStatusFixture } from "./debt-sync-status.utils";

const test = mergeTests(debtTest, debtSyncStatusFixture);

test("No their debt - shows an out-of-sync push status", async ({
	page,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectTooltip,
	mockConnectedAccount,
}) => {
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirNonExistent).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("unsync-icon"),
		}),
	).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("outcoming-icon"),
		}),
	).toBeVisible();

	await expectTooltip(debtSyncStatus, "Out of sync, we intend to push");
});

test("Their debt in sync - shows an in-sync status", async ({
	page,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectTooltip,
	mockConnectedAccount,
}) => {
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirSynced).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("sync-icon"),
		}),
	).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("incoming-icon"),
		}),
	).not.toBeAttached();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("outcoming-icon"),
		}),
	).not.toBeAttached();

	await expectTooltip(debtSyncStatus, "In sync with them");
});

test("Desynced, their update is more recent - shows an incoming icon", async ({
	page,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectTooltip,
	mockConnectedAccount,
}) => {
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirDesynced).filter(isNonNullish),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("unsync-icon"),
		}),
	).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("incoming-icon"),
		}),
	).toBeVisible();

	await expectTooltip(debtSyncStatus, "Out of sync, they intend to sync");
});

test("Desynced, our update is more recent - shows an outgoing icon", async ({
	page,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectTooltip,
	mockConnectedAccount,
}) => {
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generatedDebt) => ({
				...generatedDebt,
				their: {
					updatedAt: generatedDebt.updatedAt.subtract({ days: 1 }),
					currencyCode: generatedDebt.currencyCode,
					timestamp: generatedDebt.timestamp,
					amount: generatedDebt.amount + 1,
				},
			})),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("unsync-icon"),
		}),
	).toBeVisible();
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("outcoming-icon"),
		}),
	).toBeVisible();

	await expectTooltip(debtSyncStatus, "Out of sync, we intend to sync");
});

test("Desynced with tied updates - defaults to outgoing", async ({
	page,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectTooltip,
	mockConnectedAccount,
}) => {
	const { debt, debtPeer } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generatedDebt) => ({
				...generatedDebt,
				their: {
					updatedAt: generatedDebt.updatedAt,
					currencyCode: generatedDebt.currencyCode,
					timestamp: generatedDebt.timestamp,
					amount: generatedDebt.amount + 1,
				},
			})),
	});
	mockConnectedAccount(debtPeer.id);
	await openDebtScreen(debt.id);
	await expect(
		debtSyncStatus.filter({
			has: page.getByTestId("outcoming-icon"),
		}),
	).toBeVisible();
	await expectTooltip(debtSyncStatus, "Out of sync, we intend to sync");
});
