import { expect } from "@playwright/test";

import { test } from "~app/features/user-debts/__tests__/even-debts-divider.utils";
import { debtsWithDividers } from "~app/hooks/__tests__/use-dividers.utils";
import { SETTINGS_COOKIE_NAME } from "~app/utils/cookie/settings";
import { getCurrencySymbol } from "~utils/currency-data";

test("Multiple dividers", async ({
	openUserDebts,
	mockDebts,
	cookieManager,
	evenDebtsDivider,
	getGenerateDebts,
	debtAmount,
}) => {
	await cookieManager.addCookie(SETTINGS_COOKIE_NAME, {
		showResolvedDebts: true,
	});
	const onlyDebts = debtsWithDividers.filter(
		(debtOrDivider) => "amount" in debtOrDivider,
	);
	const { user, debts } = mockDebts({
		generateDebts: getGenerateDebts(onlyDebts),
	});
	await openUserDebts(user.id, { awaitDebts: debts.length });
	await expect(evenDebtsDivider.or(debtAmount)).toHaveText(
		debtsWithDividers.toReversed().map((debtOrDivider) => {
			if ("amount" in debtOrDivider) {
				return `${Math.abs(debtOrDivider.amount)} ${getCurrencySymbol(
					debtOrDivider.currencyCode,
				)}`;
			}
			return `Even on ${getCurrencySymbol(debtOrDivider.dividerCurrencyCode)}`;
		}),
	);
});
