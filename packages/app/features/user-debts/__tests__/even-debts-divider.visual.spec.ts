import { SETTINGS_COOKIE_NAME } from "~app/utils/cookie/settings";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";

import { test } from "./even-debts-divider.utils";

test("Divider", async ({
	openUserDebts,
	expectScreenshotWithSchemes,
	mockDebts,
	cookieManager,
	evenDebtsDivider,
}) => {
	await cookieManager.addCookie(SETTINGS_COOKIE_NAME, {
		showResolvedDebts: true,
	});
	const { debtUser, debts } = mockDebts({
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
	await openUserDebts(debtUser.id, { awaitDebts: debts.length });
	await expectScreenshotWithSchemes("divider.png", {
		locator: evenDebtsDivider,
	});
});
