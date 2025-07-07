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

test.describe("external query status", () => {
	test("pending", async ({
		api,
		page,
		mockDebts,
		openUserDebtsScreen,
		debtsGroupElement,
		debtsGroup,
		skeleton,
		awaitCacheKey,
	}) => {
		const { debtUser, debts } = await mockDebts();
		const getUserDebtsPause = api.createPause();
		api.mockFirst("debts.getAllUser", async ({ next }) => {
			await getUserDebtsPause.promise;
			return next();
		});
		await openUserDebtsScreen(debtUser.id, { awaitCache: false });
		await expect(
			skeleton.and(page.getByTestId("debt-group-element")).first(),
		).toBeVisible();
		await expect(debtsGroup).not.toBeAttached();
		await expect(debtsGroupElement).not.toBeAttached();
		getUserDebtsPause.resolve();
		await awaitCacheKey("debts.getAllUser");
		await expect(debtsGroup).toBeVisible();
		await expect(debtsGroupElement).toHaveCount(debts.length);
		await expect(
			skeleton.and(page.getByTestId("debt-group-element")),
		).toBeHidden();
	});

	test("errors", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		snapshotQueries,
		debtsGroup,
		errorMessage,
		awaitCacheKey,
	}) => {
		const { debtUser } = await mockDebts({
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
		});
		const unmockGetDebt = api.mockFirst("debts.getAllUser", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.getAllUser" error`,
			});
		});
		await openUserDebtsScreen(debtUser.id, { awaitCache: false });
		await awaitCacheKey("debts.getAllUser", { errored: 1 });
		const getAllUserErrorLocator = errorMessage(
			'Mock "debts.getAllUser" error',
		).first();
		await expect(getAllUserErrorLocator).toBeVisible();
		await expect(debtsGroup).toBeHidden();
		unmockGetDebt();
		await snapshotQueries(
			async () => {
				await getAllUserErrorLocator
					.locator("button", { hasText: "Refetch" })
					.click();
				await awaitCacheKey("debts.getAllUser", { succeed: 1 });
			},
			{ name: "grouped-errors", blacklistKeys: ["debts.get"] },
		);
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
