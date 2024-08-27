import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as originalTest } from "~app/features/debts-exchange/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localFixture } from "./debts-group.utils";

const test = mergeTests(originalTest, localFixture);

test("'currency.getList' pending / error", async ({
	api,
	mockDebts,
	openDebtsExchangeScreen,
	exchangeAllToOneButton,
	exchangeSpecificButton,
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
	api.mock("currency.getList", async () => {
		await currencyListPause.wait();
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "currency.getList" error`,
		});
	});
	await openDebtsExchangeScreen(user.id);

	await expect(exchangeAllToOneButton).toBeVisible();
	await expect(exchangeSpecificButton).toBeVisible();
	await expect(debtsGroupElement).toHaveText("100 USD");

	currencyListPause.resolve();
	await expect(exchangeAllToOneButton).toBeVisible();
	await expect(exchangeSpecificButton).toBeVisible();
	await expect(debtsGroupElement).toHaveText("100 USD");
});

test("Rounding", async ({
	mockDebts,
	openDebtsExchangeScreen,
	debtsGroupElement,
}) => {
	const { user } = mockDebts({
		generateDebts: (opts) => {
			const [debt] = defaultGenerateDebts(opts);
			assert(debt);
			return [
				{ ...debt, currencyCode: "USD", amount: 1.234 },
				{ ...debt, currencyCode: "EUR", amount: 1.235 },
			];
		},
	});
	await openDebtsExchangeScreen(user.id);

	await expect(debtsGroupElement.first()).toHaveText("1.23 $");
	await expect(debtsGroupElement.last()).toHaveText("1.24 €");
});
