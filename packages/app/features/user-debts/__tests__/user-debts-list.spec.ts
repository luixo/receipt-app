import { expect } from "@playwright/test";

import { formatCurrency, getCurrencySymbol } from "~app/utils/currency";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { localSettings } from "~tests/frontend/consts";

import { test } from "./even-debts-divider.utils";
import { debtsWithDividers } from "./user-debts-list.utils";

// Currently only dividers test are available
test("Multiple dividers", async ({
	openUserDebts,
	mockDebts,
	cookieManager,
	evenDebtsDivider,
	getGenerateDebts,
	debtAmount,
}) => {
	await cookieManager.addCookie(SETTINGS_STORE_NAME, {
		showResolvedDebts: true,
	});
	const onlyDebts = debtsWithDividers.filter(
		(debtOrDivider) => "amount" in debtOrDivider,
	);
	const { debtUser, debts } = mockDebts({
		generateDebts: getGenerateDebts(onlyDebts),
	});
	await openUserDebts(debtUser.id, { awaitDebts: debts.length });
	await expect(evenDebtsDivider.or(debtAmount)).toHaveText(
		debtsWithDividers.toReversed().map((debtOrDivider) => {
			if ("amount" in debtOrDivider) {
				return formatCurrency(
					localSettings.locale,
					debtOrDivider.currencyCode,
					Math.abs(debtOrDivider.amount),
				);
			}
			return `Even on ${getCurrencySymbol(
				localSettings.locale,
				debtOrDivider.dividerCurrencyCode,
			)}`;
		}),
	);
});
