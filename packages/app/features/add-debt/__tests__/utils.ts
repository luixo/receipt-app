import type { Locator } from "@playwright/test";

import type { Currencies, Peer } from "~app/trpc-types";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<
		{
			topCurrencies: Currencies;
			peers: ReturnType<GeneratePeers>;
		} & Awaited<
			ReturnType<
				ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
			>
		>
	>;
	addButton: Locator;
	amountInput: Locator;
	currencyInput: Locator;
	dateInput: Locator;
	noteInput: Locator;
	fillValidForm: (peer: Peer) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			const topCurrencies = generateAmount(faker, 5, () => ({
				currencyCode: generateCurrencyCode(faker),
				count: faker.number.int(100),
			}));
			api.mockFirst("currency.top", {
				items: topCurrencies.toSorted((a, b) => b.count - a.count),
			});
			const peers = defaultGeneratePeers({ faker });
			api.mockFirst("peers.suggestTop", { items: peers.map((u) => u.id) });
			api.mockFirst("peers.suggest", { cursor: 0, count: 0, items: [] });
			api.mockUtils.mockPeers(...peers);
			return { topCurrencies, peers, ...auth };
		}),

	addButton: ({ page }, use) =>
		use(page.locator("button[type=submit]", { hasText: "Add debt" })),

	amountInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Amount" })),

	currencyInput: ({ page }, use) => use(page.locator('input[name="currency"]')),

	dateInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Date" })),

	noteInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Debt note" })),

	fillValidForm: ({ amountInput, noteInput, fillPeer }, use) =>
		use(async (peer: Peer) => {
			await fillPeer(peer);
			await amountInput.fill("10");
			// Tab out to trigger react-aria NumberField's blur/commit
			await amountInput.press("Tab");
			await noteInput.fill("Test debt note");
			// currencyCode: auto-loaded from currency.top — no interaction needed
			// timestamp: defaults to today — no interaction needed
			// direction: defaults to "+" — no interaction needed
		}),
});
