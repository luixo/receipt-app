import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

const criticalPaths = ["debts.getByUserPaged", "debts.getAllUser"] as const;
criticalPaths.forEach((path) => {
	const otherPaths = criticalPaths.filter((lookupPath) => lookupPath !== path);
	test.describe(`'${path}' query`, () => {
		test("errors", async ({
			api,
			mockDebts,
			openUserDebtsScreen,
			snapshotQueries,
			debtsGroup,
			errorMessage,
			awaitCacheKey,
			consoleManager,
		}) => {
			const { debtUser } = await mockDebts({
				generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
			});
			const unmockError = api.mockFirst(path, () => {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Mock "${path}" error`,
				});
			});
			consoleManager.ignore(new RegExp(`Mock "${path}" error`));
			consoleManager.ignore(
				new RegExp(
					`Error in route match: /_protected/debts/user/${debtUser.id}/{\\"offset\\":0,\\"limit\\":10}`,
				),
			);
			await snapshotQueries(
				async () => {
					await openUserDebtsScreen(debtUser.id, { awaitCache: false });
					await awaitCacheKey(path, { errored: 1 });
				},
				{
					name: `${path}-errors`,
					blacklistKeys: otherPaths,
				},
			);
			const getAllUserErrorLocator = errorMessage(
				`Mock "${path}" error`,
			).first();
			await expect(getAllUserErrorLocator).toBeVisible();
			await expect(debtsGroup).toBeHidden();
			unmockError();
			await snapshotQueries(
				async () => {
					await getAllUserErrorLocator
						.locator("button", { hasText: "Refetch" })
						.click();
					await awaitCacheKey(path, { succeed: 1 });
					await Promise.all(
						otherPaths.map((anotherPath) =>
							awaitCacheKey(anotherPath, { succeed: 1 }),
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
});

test("Empty state", async ({ mockDebts, openUserDebtsScreen, debtsGroup }) => {
	const { debtUser } = await mockDebts({
		generateDebts: () => [],
	});
	await openUserDebtsScreen(debtUser.id);
	await expect(debtsGroup).toHaveText("No debts yet");
});

test("Rounding", async ({
	mockDebts,
	openUserDebtsScreen,
	debtsGroupElement,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: (opts) => {
			const [debt] = defaultGenerateDebts(opts);
			assert(debt);
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
	await openUserDebtsScreen(debtUser.id, { awaitDebts: 2 });

	await expect(debtsGroupElement.first()).toHaveText(
		formatCurrency(localSettings.locale, "USD", 1.23),
	);
	await expect(debtsGroupElement.last()).toHaveText(
		formatCurrency(localSettings.locale, "EUR", 1.24),
	);
});
