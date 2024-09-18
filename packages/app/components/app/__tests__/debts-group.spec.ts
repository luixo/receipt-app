import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getCurrencySymbol } from "~utils/currency-data";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

test.describe("'currency.getList'", () => {
	test("pending", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		debtsGroupElement,
	}) => {
		const { user } = mockDebts({
			generateDebts: (opts) => {
				const [debt] = defaultGenerateDebts(opts);
				assert(debt);
				return [{ ...debt, currencyCode: "USD", amount: 100 }];
			},
		});
		const currencyListPause = api.createPause();
		api.mock("currency.getList", async ({ next }) => {
			await currencyListPause.promise;
			return next();
		});
		await openUserDebtsScreen(user.id);
		await expect(debtsGroupElement).toHaveText("100 USD");
	});

	test("error", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		debtsGroupElement,
	}) => {
		const { user } = mockDebts({
			generateDebts: (opts) => {
				const [debt] = defaultGenerateDebts(opts);
				assert(debt);
				return [{ ...debt, currencyCode: "USD", amount: 100 }];
			},
		});
		api.mock("currency.getList", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "currency.getList" error`,
			});
		});
		await openUserDebtsScreen(user.id);
		await expect(debtsGroupElement).toHaveText("100 USD");
	});
});

test.describe("external query status", () => {
	test("pending", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		debtsGroupElement,
		debtsGroup,
		loader,
	}) => {
		const { user, debts } = mockDebts();
		const debtPause = api.createPause();
		api.mock("debts.get", async ({ next, input: { id } }) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (id === debts[0]!.id) {
				return next();
			}
			await debtPause.promise;
			return next();
		});
		await openUserDebtsScreen(user.id);
		await expect(debtsGroup.filter({ has: loader })).toBeVisible();
		await expect(debtsGroupElement).not.toBeAttached();
		debtPause.resolve();
		await expect(debtsGroupElement).toHaveCount(debts.length);
		await expect(debtsGroup.filter({ has: loader })).not.toBeVisible();
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
		const { user, debts } = mockDebts({
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
		});
		const unmockGetDebt = api.mock("debts.get", ({ input: { id } }) => {
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
		await openUserDebtsScreen(user.id);
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
	const { user } = mockDebts({
		generateDebts: () => [],
	});
	await openUserDebtsScreen(user.id);
	await expect(debtsGroup).toHaveText("No debts yet");
});

test("Rounding", async ({
	mockDebts,
	openUserDebtsScreen,
	debtsGroupElement,
}) => {
	const { user } = mockDebts({
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
	await openUserDebtsScreen(user.id, { awaitDebts: 2 });

	await expect(debtsGroupElement.first()).toHaveText(
		`1.23 ${getCurrencySymbol("USD")}`,
	);
	await expect(debtsGroupElement.last()).toHaveText(
		`1.24 ${getCurrencySymbol("EUR")}`,
	);
});
