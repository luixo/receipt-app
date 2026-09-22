import { formatCurrency, getCurrencySymbol } from "~app/utils/currency";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./even-debts-divider.utils";
import { debtsWithDividers } from "./peer-debts-list.utils";

test("Multiple dividers", async ({
	openPeerDebts,
	api,
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
	const { debtPeer, debts } = await mockDebts({
		generateDebts: getGenerateDebts(onlyDebts),
	});
	api.mockFirst("debts.getByPeerPaged", ({ input }) => ({
		items: debts.map(({ id }) => id),
		count: debts.length,
		cursor: input.cursor,
	}));
	await openPeerDebts(debtPeer.id, { awaitDebts: debts.length });
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

test("Fetches previous pages for a divider", async ({
	page,
	api,
	mockDebts,
	getGenerateDebts,
	evenDebtsDivider,
	awaitCacheKey,
	cookieManager,
}) => {
	const debtDefinitions = Array.from({ length: 11 }, (_, index) => ({
		currencyCode: "USD",
		amount: index === 0 ? 0 : 1,
	}));
	const { debtPeer, debts } = await mockDebts({
		generateDebts: getGenerateDebts(debtDefinitions),
	});
	await cookieManager.addCookie(SETTINGS_STORE_NAME, {
		showResolvedDebts: true,
	});
	api.mockFirst("debts.getByPeerPaged", ({ input: { cursor, limit } }) => ({
		items: debts.slice(cursor, cursor + limit).map(({ id }) => id),
		count: debts.length,
		cursor,
	}));
	await page.navigate({
		to: "/debts/peer/$id",
		params: { id: debtPeer.id },
		search: { limit: 10, offset: 10 },
	});
	await awaitCacheKey("debts.getByPeerPaged", {
		input: {
			cursor: 10,
			limit: 10,
			peerId: debtPeer.id,
			filters: { showResolved: true },
		},
	});
	await awaitCacheKey("debts.get", debts.length);
	await expect(evenDebtsDivider).toBeVisible();
});
