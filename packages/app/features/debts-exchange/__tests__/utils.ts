import type { Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";
import { entries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { PeerId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import type { GeneratePeers } from "~tests/frontend/generators/peers";

type Fixtures = {
	mockBase: () => Promise<{
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	openDebtsExchangeScreen: (
		peerId: PeerId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	exchangeAllToOneButton: Locator;
	exchangeSpecificButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage();
			const [debtPeer] = defaultGeneratePeers({ faker, amount: 1 });
			assert.ok(debtPeer);
			api.mockUtils.mockPeers(debtPeer);
			return { debtPeer };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { debtPeer } = await mockBase();
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				peerId: debtPeer.id,
			});
			const aggregatedDebts = entries(
				debts.reduce<Record<CurrencyCode, number>>(
					(acc, { currencyCode, amount }) => ({
						...acc,
						[currencyCode]: (acc[currencyCode] || 0) + amount,
					}),
					{},
				),
			).map(([currencyCode, sum]) => ({ currencyCode, sum }));
			api.mockFirst("debts.getAllPeer", { items: aggregatedDebts });
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				const matchedDebt = debts.find((debt) => debt.id === lookupId);
				if (!matchedDebt) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Expected to have debt id "${lookupId}", but none found`,
					});
				}
				return { ...matchedDebt, peerId: debtPeer.id };
			});
			api.mockFirst("debts.getByPeerPaged", () => ({
				cursor: 0,
				count: debts.length,
				items: debts.map((debt) => debt.id),
			}));
			return { debts, debtPeer };
		}),

	openDebtsExchangeScreen: ({ page, awaitCacheKey }, use) =>
		use(async (peerId, { awaitCache = true } = {}) => {
			await page.navigate({
				to: "/debts/peer/$id/exchange",
				params: { id: peerId },
			});
			if (awaitCache) {
				await awaitCacheKey("peers.get");
				await awaitCacheKey("debts.getAllPeer");
			}
		}),

	exchangeAllToOneButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Exchange all to one currency" })),
	exchangeSpecificButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Exchange specific currency" })),
});
