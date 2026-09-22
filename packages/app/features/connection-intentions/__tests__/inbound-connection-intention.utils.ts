import type { Locator } from "@playwright/test";

import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test as originalTest } from "./utils";

type Fixtures = {
	rejectButton: Locator;
	confirmDialog: Locator;
	confirmYesButton: Locator;
	confirmNoButton: Locator;
	mockSuggestedPeers: (
		amount?: number,
	) => ReturnType<typeof defaultGeneratePeers>;
};

export const test = originalTest.extend<Fixtures>({
	rejectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reject" })),
	confirmDialog: ({ modal }, use) => use(modal("Connect an account")),
	confirmYesButton: ({ confirmDialog }, use) =>
		use(confirmDialog.getByRole("button", { name: "Yes" })),
	confirmNoButton: ({ confirmDialog }, use) =>
		use(confirmDialog.getByRole("button", { name: "No" })),
	mockSuggestedPeers: ({ api, faker }, use) =>
		use((amount = 1) => {
			const peers = defaultGeneratePeers({ faker, amount });
			api.mockUtils.mockPeers(...peers);
			api.mockFirst("peers.suggestTop", {
				items: peers.map((peer) => peer.id),
			});
			return peers;
		}),
});
