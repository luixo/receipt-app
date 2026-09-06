import { mergeTests } from "@playwright/test";
import { isNonNullish } from "remeda";

import { test as debtTest } from "~app/features/debt/__tests__/utils";
import type { UserId } from "~db/ids";
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

test("Out of sync (push)", async ({
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirNonExistent).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("out-of-sync-push.png", {
		locator: debtSyncStatus,
	});
});

test("In sync", async ({
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirSynced).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("in-sync.png", {
		locator: debtSyncStatus,
	});
});

test("Out of sync (incoming)", async ({
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map(theirDesynced).filter(isNonNullish),
	});
	mockConnectedAccount(api, faker, debtUser.id);
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("out-of-sync-incoming.png", {
		locator: debtSyncStatus,
	});
});
