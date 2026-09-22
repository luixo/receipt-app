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
	mockBase: (options?: { generatePeers?: GeneratePeers }) => Promise<{
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	mockDebts: (options?: {
		generatePeers?: GeneratePeers;
		generateDebts?: GenerateDebts;
	}) => Promise<{
		debts: ReturnType<GenerateDebts>;
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	openPeerDebts: (
		peerId: PeerId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
	debtAmount: Locator;
	debtPreview: Locator;
	removeDebtsButton: Locator;
	showResolvedButton: Locator;
	debtCheckbox: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async ({ generatePeers = defaultGeneratePeers } = {}) => {
			await api.mockUtils.authPage();
			api.mockLast("currency.top", { items: [] });
			api.mockLast("peers.suggestTop", { items: [] });
			const [debtPeer] = generatePeers({ faker, amount: 1 });
			assert.ok(debtPeer);
			api.mockUtils.mockPeers(debtPeer);
			return { debtPeer };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(
			async ({ generateDebts = defaultGenerateDebts, generatePeers } = {}) => {
				const { debtPeer } = await mockBase({ generatePeers });
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
				api.mockFirst("debts.getByPeerPaged", ({ input }) => ({
					items: debts
						.map(({ id }) => id)
						.slice(input.cursor, input.limit + input.cursor),
					count: debts.length,
					cursor: input.cursor,
				}));
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
				return { debts, debtPeer };
			},
		),

	openPeerDebts: ({ page, awaitCacheKey }, use) =>
		use(async (peerId, { awaitCache = true, awaitDebts } = {}) => {
			await page.navigate({ to: "/debts/peer/$id", params: { id: peerId } });
			if (awaitCache) {
				await awaitCacheKey("peers.get");
				await awaitCacheKey("debts.getAllPeer");
				await awaitCacheKey("debts.getByPeerPaged");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),
	debtAmount: ({ page }, use) => use(page.getByTestId("preview-debt-amount")),
	debtPreview: ({ page }, use) => use(page.getByTestId("peer-debt-preview")),
	removeDebtsButton: ({ paginationBlock }, use) =>
		use(paginationBlock.getByTestId("remove-button")),
	showResolvedButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Show resolved debts" })),
	debtCheckbox: ({ debtPreview }, use) =>
		use(debtPreview.getByTestId("checkbox")),
});
