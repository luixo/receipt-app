import type { Locator } from "@playwright/test";
import { mergeTests } from "@playwright/test";
import assert from "node:assert";
import { entries } from "remeda";

import { test as peersSuggestFixture } from "~app/components/app/__tests__/peers-suggest.utils";
import { getCurrencySymbol } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import type { PeerId } from "~db/ids";
import { localSettings } from "~tests/frontend/consts";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import type { GeneratePeers } from "~tests/frontend/generators/peers";

type Fixtures = {
	mockBase: () => Promise<{
		fromPeer: ReturnType<GeneratePeers>[number];
		toPeer: ReturnType<GeneratePeers>[number];
	}>;
	mockDebtsTransfer: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		fromPeer: ReturnType<GeneratePeers>[number];
		toPeer: ReturnType<GeneratePeers>[number];
	}>;
	openDebtsTransferScreen: (options?: {
		fromPeerId?: PeerId;
		toPeerId?: PeerId;
		awaitCache?: boolean;
	}) => Promise<void>;
	fromPeerSuggestInput: Locator;
	toPeerSuggestInput: Locator;
	submitButton: Locator;
	addCurrencyButton: Locator;
	currencyPickerDialog: Locator;
	allMaxButton: Locator;
	amountInput: (currencyCode: CurrencyCode) => Locator;
	transferForm: Locator;
};

const mergedTest = mergeTests(originalTest, peersSuggestFixture);

export const test = mergedTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage();
			const [fromPeer, toPeer] = defaultGeneratePeers({ faker, amount: 2 });
			assert.ok(fromPeer);
			assert.ok(toPeer);
			api.mockFirst("peers.suggestTop", { items: [fromPeer.id, toPeer.id] });
			api.mockFirst("peers.suggest", { cursor: 0, count: 0, items: [] });
			api.mockUtils.mockPeers(fromPeer, toPeer);
			return { fromPeer, toPeer };
		}),

	mockDebtsTransfer: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { fromPeer, toPeer } = await mockBase();
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				peerId: fromPeer.id,
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
			api.mockUtils.mockPeers(fromPeer, toPeer);
			return { debts, fromPeer, toPeer };
		}),

	openDebtsTransferScreen: ({ page, awaitCacheKey }, use) =>
		use(async ({ fromPeerId, toPeerId, awaitCache = true } = {}) => {
			await page.navigate({
				to: "/debts/transfer",
				search: { to: toPeerId, from: fromPeerId },
			});
			if (awaitCache) {
				if (fromPeerId || toPeerId) {
					await awaitCacheKey("peers.get", { success: 2 });
				}
				if (fromPeerId) {
					await awaitCacheKey("debts.getAllPeer");
				}
			}
		}),

	fromPeerSuggestInput: ({ page }, use) => use(page.getByLabel("From")),

	toPeerSuggestInput: ({ page }, use) => use(page.getByLabel("To")),

	submitButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Transfer debt(s)" })),

	addCurrencyButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add a currency" })),

	currencyPickerDialog: ({ page }, use) =>
		use(page.getByTestId("currencies-picker")),

	allMaxButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "All max" })),

	amountInput: ({ page }, use) =>
		use((currencyCode) =>
			page.getByRole("textbox", {
				name: getCurrencySymbol(localSettings.locale, currencyCode),
			}),
		),

	transferForm: ({ page }, use) => use(page.getByTestId("debts-transfer-form")),
});
