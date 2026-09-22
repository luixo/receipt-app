import type { Locator } from "@playwright/test";
import assert from "node:assert";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebtIntentions } from "~tests/frontend/generators/debts";
import { defaultGenerateDebtIntentions } from "~tests/frontend/generators/debts";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

type Fixtures = {
	mockDebts: (options: {
		generateDebtIntentions?: GenerateDebtIntentions;
	}) => Promise<{
		debtIntenions: ReturnType<GenerateDebtIntentions>;
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	acceptButton: Locator;
	acceptAndEditButton: Locator;
	rejectButton: Locator;
	inboundDebtIntentionRow: Locator;
	acceptAllIntentionButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockDebts: ({ api, faker }, use) =>
		use(async ({ generateDebtIntentions = defaultGenerateDebtIntentions }) => {
			await api.mockUtils.authPage();
			const [debtPeer] = defaultGeneratePeers({ faker, amount: 1 });
			assert.ok(debtPeer);
			api.mockUtils.mockPeers(debtPeer);
			const debtIntenions = generateDebtIntentions({
				faker,
				amount: { min: 3, max: 6 },
				peerId: debtPeer.id,
			});
			api.mockFirst("debtIntentions.getAll", {
				items: debtIntenions,
			});
			api.mockFirst("debts.getAllPeer", { items: [] });
			return { debtIntenions, debtPeer };
		}),

	acceptButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept", exact: true })),
	acceptAndEditButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept and edit" })),
	rejectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reject" })),
	inboundDebtIntentionRow: ({ page }, use) =>
		use(page.getByTestId("inbound-debt-intention")),
	acceptAllIntentionButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept all intentions" })),
});
