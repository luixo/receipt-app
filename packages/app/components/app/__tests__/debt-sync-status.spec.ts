import type { Locator, Page } from "@playwright/test";
import { mergeTests } from "@playwright/test";
import { isNonNullish } from "remeda";

import { test as debtTest } from "~app/features/debt/__tests__/utils";
import type { UserId } from "~db/ids";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebts,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/debts";
import type { ExtractFixture } from "~tests/frontend/types";

import { test as debtSyncStatusFixture } from "./debt-sync-status.utils";

const test = mergeTests(debtTest, debtSyncStatusFixture);

type Api = ExtractFixture<typeof debtTest>["api"];
type Faker = ExtractFixture<typeof debtTest>["faker"];

// DebtSyncStatus is only rendered next to a debt user with a connected
// account - `mockDebt` generates a user without one by default.
const mockConnectedAccount = (api: Api, faker: Faker, userId: UserId) => {
	api.mockFirst("users.get", ({ input, next }) => {
		if (input.id !== userId) {
			return next();
		}
		return {
			id: userId,
			name: faker.person.fullName(),
			publicName: undefined,
			connectedAccount: {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				avatarUrl: undefined,
			},
		};
	});
};

// Hovering straight onto the target sometimes doesn't register as a real
// pointer-enter for react-aria's `useHover` - moving the pointer away first
// makes the follow-up hover reliable.
const hoverToShowTooltip = async (page: Page, locator: Locator) => {
	await page.mouse.move(0, 0);
	await locator.hover();
};

test("No their debt - shows an out-of-sync push status", async ({
	page,
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	tooltip,
}) => {
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirNonExistent).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(debtSyncStatus).toHaveClass(/text-warning/);
	await expect(
		debtSyncStatus.locator("svg.lucide-refresh-cw-off"),
	).toBeVisible();
	await expect(
		debtSyncStatus.locator("svg.lucide-arrow-right-from-line"),
	).toBeVisible();

	await hoverToShowTooltip(page, debtSyncStatus);
	await expect(tooltip).toHaveText("Out of sync, we intent to push");
});

test("Their debt in sync - shows an in-sync status", async ({
	page,
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	tooltip,
}) => {
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirSynced).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(debtSyncStatus).toHaveClass(/text-success/);
	await expect(debtSyncStatus.locator("svg.lucide-refresh-cw")).toBeVisible();
	await expect(
		debtSyncStatus.locator("svg.lucide-arrow-left-from-line"),
	).toHaveCount(0);
	await expect(
		debtSyncStatus.locator("svg.lucide-arrow-right-from-line"),
	).toHaveCount(0);

	await hoverToShowTooltip(page, debtSyncStatus);
	await expect(tooltip).toHaveText("In sync with them");
});

test("Desynced, their update is more recent - shows an incoming icon", async ({
	page,
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	tooltip,
}) => {
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirDesynced).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(debtSyncStatus).toHaveClass(/text-warning/);
	await expect(
		debtSyncStatus.locator("svg.lucide-refresh-cw-off"),
	).toBeVisible();
	await expect(
		debtSyncStatus.locator("svg.lucide-arrow-left-from-line"),
	).toBeVisible();

	await hoverToShowTooltip(page, debtSyncStatus);
	await expect(tooltip).toHaveText("Out of sync, they intent to sync");
});

test("Desynced, our update is more recent (or tied) - shows an outcoming icon", async ({
	page,
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	tooltip,
}) => {
	const { debt, debtUser } = await mockDebt({
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
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(debtSyncStatus).toHaveClass(/text-warning/);
	await expect(
		debtSyncStatus.locator("svg.lucide-refresh-cw-off"),
	).toBeVisible();
	await expect(
		debtSyncStatus.locator("svg.lucide-arrow-right-from-line"),
	).toBeVisible();

	await hoverToShowTooltip(page, debtSyncStatus);
	await expect(tooltip).toHaveText("Out of sync, we intent to sync");
});
