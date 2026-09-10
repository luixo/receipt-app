import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

const criticalPaths = ["debts.getByUserPaged", "debts.getAllUser"] as const;
for (const path of criticalPaths) {
	const otherPaths = criticalPaths.filter((lookupPath) => lookupPath !== path);

	test.describe(`'${path}' query`, () => {
		test("errors", async ({
			api,
			mockDebts,
			openUserDebtsScreen,
			snapshotQueries,
			errorMessage,
			awaitCacheKey,
			consoleManager,
		}) => {
			const {
				users: [firstUser],
			} = await mockDebts({
				generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
				generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
			});
			assert.ok(firstUser);
			const pathErrorMessage = `Mock "${path}" error`;
			const unmockError = api.mockFirst(path, () => {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: pathErrorMessage,
				});
			});
			consoleManager.ignore(pathErrorMessage);
			consoleManager.ignore(
				new RegExp(
					`Error in route match: /_protected/debts/user/${firstUser.id}/`,
				),
			);
			const getAllUserErrorLocator = errorMessage(pathErrorMessage).first();
			await snapshotQueries(
				async () => {
					await openUserDebtsScreen(firstUser.id, { awaitCache: false });
					await awaitCacheKey(path, { error: 1 });
					await expect(getAllUserErrorLocator).toBeVisible();
				},
				{
					name: `${path}-errors`,
					blacklistKeys: otherPaths,
				},
			);
			unmockError();
			await snapshotQueries(
				async () => {
					await getAllUserErrorLocator
						.locator("button", { hasText: "Refetch" })
						.click();
					await awaitCacheKey(path, { success: 1 });
					await Promise.all(
						otherPaths.map((anotherPath) =>
							awaitCacheKey(anotherPath, { success: 1 }),
						),
					);
				},
				{
					name: `${path}-refetch`,
					blacklistKeys: ["debts.get", "users.get", ...otherPaths],
				},
			);
		});
	});
}

test("Empty state", async ({ mockDebts, openUserDebtsScreen, debtsGroup }) => {
	const {
		users: [firstUser],
	} = await mockDebts({
		generateDebts: () => [],
	});
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id);
	await expect(debtsGroup).toHaveText("No debts yet");
});

test("Rounding", async ({
	mockDebts,
	openUserDebtsScreen,
	debtsGroupElement,
}) => {
	const {
		users: [firstUser],
	} = await mockDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
		generateDebts: (opts) => {
			const [debt] = defaultGenerateDebts(opts);
			assert.ok(debt);
			return [
				{
					...debt,
					id: `${debt.id.slice(0, -1)}a`,
					currencyCode: "USD",
					amount: 1.234,
				},
				{
					...debt,
					id: `${debt.id.slice(0, -1)}b`,
					currencyCode: "EUR",
					amount: 1.235,
				},
			];
		},
	});
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id, { awaitDebts: 2 });

	await expect(debtsGroupElement.first()).toHaveText(
		formatCurrency(localSettings.locale, "USD", 1.23),
	);
	await expect(debtsGroupElement.last()).toHaveText(
		formatCurrency(localSettings.locale, "EUR", 1.24),
	);
});
