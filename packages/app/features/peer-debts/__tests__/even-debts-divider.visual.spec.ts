import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";

import { test } from "./even-debts-divider.utils";

test("Divider", async ({
	openPeerDebts,
	expectScreenshotWithSchemes,
	mockDebts,
	cookieManager,
	evenDebtsDivider,
}) => {
	await cookieManager.addCookie(SETTINGS_STORE_NAME, {
		showResolvedDebts: true,
	});
	const { debtPeer, debts } = await mockDebts({
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
	await openPeerDebts(debtPeer.id, { awaitDebts: debts.length });
	await expectScreenshotWithSchemes("divider.png", {
		locator: evenDebtsDivider,
	});
});
