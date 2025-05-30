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
		mockDebts,
		openUserDebtsScreen,
		debtsGroupElement,
		debtsGroup,
		skeleton,
	}) => {
		const { debtUser, debts } = mockDebts();
		const debtPause = api.createPause();
		api.mockFirst("debts.get", async ({ next, input: { id } }) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (id === debts[0]!.id) {
				return next();
			}
			await debtPause.promise;
			return next();
		});
		await openUserDebtsScreen(debtUser.id);
		await expect(debtsGroup.filter({ has: skeleton })).toBeVisible();
		await expect(debtsGroupElement).not.toBeAttached();
		debtPause.resolve();
		await expect(debtsGroupElement).toHaveCount(debts.length);
		await expect(debtsGroup.filter({ has: skeleton })).toBeHidden();
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
		const { debtUser, debts } = mockDebts({
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
		});
		const unmockGetDebt = api.mockFirst("debts.get", ({ input: { id } }) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (id === debts[0]!.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Mock "debts.get" error type 1`,
				});
			}
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error type 2`,
			});
		});
		await openUserDebtsScreen(debtUser.id);
		await expect(
			debtsGroup.filter({
				has: errorMessage('Mock "debts.get" error type 1'),
			}),
		).toHaveCount(1);
		await expect(
			debtsGroup.filter({
				has: errorMessage('Mock "debts.get" error type 2'),
			}),
		).toHaveCount(1);
		unmockGetDebt();
		await snapshotQueries(
			// Veryfing one click makes two calls
			// As grouped errored queries are refetched together
			async () => {
				const debtsGroupError = debtsGroup.locator(errorMessage());
				await debtsGroupError.locator("button").last().click();
				await awaitCacheKey("debts.get", { succeed: 2, errored: 1 });
				await expect(debtsGroupError).toHaveCount(1);
			},
			{ name: "grouped-errors" },
		);
	});
});

test("Empty state", async ({ mockDebts, openUserDebtsScreen, debtsGroup }) => {
	const { debtUser } = mockDebts({
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
	const { debtUser } = mockDebts({
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
