import { TRPCError } from "@trpc/server";

import { defaultGenerateDebts } from "~app/features/debts-exchange/__tests__/generators";
import { test } from "~app/features/debts-exchange/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

test("'currency.getList' pending / error", async ({
	api,
	mockDebts,
	openDebtsExchangeScreen,
	exchangeAllToOneButton,
	exchangeSpecificButton,
	debtsGroupElement,
}) => {
	api.pause("currency.getList");
	const { user } = mockDebts({
		generateDebts: (opts) => {
			const [debt] = defaultGenerateDebts(opts);
			return [{ ...debt!, currencyCode: "USD", amount: 100 }];
		},
	});
	await openDebtsExchangeScreen(user.id);

	await expect(exchangeAllToOneButton).toBeVisible();
	await expect(exchangeSpecificButton).toBeVisible();
	await expect(debtsGroupElement).toHaveText("100 USD");

	api.mock("currency.getList", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "currency.getList" error`,
		});
	});
	api.unpause("currency.getList");
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
			return [
				{ ...debt!, currencyCode: "USD", amount: 1.234 },
				{ ...debt!, currencyCode: "EUR", amount: 1.235 },
			];
		},
	});
	await openDebtsExchangeScreen(user.id);

	await expect(debtsGroupElement.first()).toHaveText("1.23 $");
	await expect(debtsGroupElement.last()).toHaveText("1.24 €");
});
