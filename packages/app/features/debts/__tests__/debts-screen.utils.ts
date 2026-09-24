import type { Locator } from "@playwright/test";

import { test as debtsTest } from "./utils";

type Fixtures = {
	mockPagedPeers: () => Promise<void>;
	showResolvedDebtsSwitch: Locator;
	peerDebtsPreview: Locator;
	debtIntentionsButton: Locator;
};

export const test = debtsTest.extend<Fixtures>({
	mockPagedPeers: ({ api, faker, mockBase }, use) =>
		use(async () => {
			const peerIds = Array.from({ length: 25 }, () => faker.string.uuid());
			const peers = peerIds.map((id) => ({
				id,
				name: faker.person.fullName(),
			}));
			await mockBase();
			api.mockFirst("debts.getAllPeer", { items: [] });
			api.mockFirst("debts.getPeersPaged", ({ input: { limit, cursor } }) => ({
				count: peerIds.length,
				cursor,
				items: peerIds.slice(cursor, cursor + limit),
			}));
			api.mockFirst("debts.getByPeerPaged", {
				cursor: 0,
				count: 0,
				items: [],
			});
			api.mockFirst("peers.get", ({ input, next }) => {
				const peer = peers.find((u) => u.id === input.id);
				if (!peer) {
					return next();
				}
				return {
					id: peer.id,
					name: peer.name,
					publicName: undefined,
					connectedUser: undefined,
				};
			});
		}),

	showResolvedDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("show-resolved-debts-switch")),

	peerDebtsPreview: ({ page }, use) =>
		use(page.getByTestId("peer-debts-preview")),

	debtIntentionsButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Intentions" })),
});
