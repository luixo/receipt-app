import { expect } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test } from "~app/features/user-debts/__tests__/even-debts-divider.utils";
import { debtsWithDividers } from "~app/hooks/__tests__/use-dividers.utils";
import { SETTINGS_COOKIE_NAME } from "~app/utils/cookie/settings";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";
import { getCurrencySymbol } from "~utils/currency-data";

test("'debts.get' pending / error", async ({
	api,
	cookieManager,
	mockDebts,
	openUserDebts,
	evenDebtsDivider,
	awaitCacheKey,
	errorMessage,
}) => {
	await cookieManager.addCookie(SETTINGS_COOKIE_NAME, {
		showResolvedDebts: true,
	});
	const { user, debts } = mockDebts({
		generateDebts: (opts) => {
			const staticCurrencyCode = generateCurrencyCode(opts.faker);
			return defaultGenerateDebts({ ...opts, amount: 3 }).map(
				(debt, index) => ({
					...debt,
					currencyCode: staticCurrencyCode,
					amount: index === 1 ? 10 : -10,
				}),
			);
		},
	});

	const debtPause = api.createPause();
	const unmockError = api.mock("debts.get", async ({ input: { id }, next }) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (id === debts[0]!.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error`,
			});
		}
		return next();
	});
	api.mock("debts.get", async ({ input: { id }, next }) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (id === debts[0]!.id) {
			await debtPause.wait();
		}
		return next();
	});

	await openUserDebts(user.id);
	await awaitCacheKey("debts.get", {
		succeed: 2,
		errored: 0,
		total: true,
		awaitLoading: false,
	});
	await expect(evenDebtsDivider).toHaveCount(0);

	debtPause.resolve();
	await awaitCacheKey("debts.get", { succeed: 2, errored: 1, total: true });
	await expect(evenDebtsDivider).toHaveCount(0);

	unmockError();
	await errorMessage().locator("button").first().click();
	await awaitCacheKey("debts.get", { succeed: 3, errored: 0, total: true });
	await expect(evenDebtsDivider).toHaveCount(1);
});

test("'showResolvedDebts' is false - all hidden", async ({
	openUserDebts,
	mockDebts,
	evenDebtsDivider,
	getGenerateDebts,
	debtAmount,
}) => {
	const onlyDebts = debtsWithDividers.filter(
		(debtOrDivider) => "amount" in debtOrDivider,
	);
	const { user, debts } = mockDebts({
		generateDebts: getGenerateDebts(onlyDebts),
	});
	await openUserDebts(user.id, { awaitDebts: debts.length });
	await expect(evenDebtsDivider).toHaveCount(0);
	await expect(debtAmount).toHaveText(
		onlyDebts
			.toReversed()
			.filter((debt) => "notResolved" in debt)
			.map(
				(debt) =>
					`${Math.abs(debt.amount)} ${getCurrencySymbol(debt.currencyCode)}`,
			),
	);
});
