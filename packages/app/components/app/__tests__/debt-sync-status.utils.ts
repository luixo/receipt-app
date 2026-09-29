import type { Locator } from "@playwright/test";

import type { Peer } from "#app/trpc-types.ts";
import type { PeerId } from "#db/ids.ts";
import { test as originalTest } from "#tests/frontend/fixtures.ts";

export type Fixtures = {
	debtSyncStatus: Locator;
	tooltip: Locator;
	mockConnectedAccount: (peerId: PeerId) => Peer;
};

export const test = originalTest.extend<Fixtures>({
	debtSyncStatus: ({ page }, use) => use(page.getByTestId("debt-sync-status")),
	tooltip: ({ page }, use) => use(page.getByRole("tooltip")),
	mockConnectedAccount: async ({ api, faker }, use) => {
		await use((peerId: PeerId) => {
			const peer = {
				id: peerId,
				name: faker.person.fullName(),
				publicName: undefined,
				connectedUser: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					avatarUrl: undefined,
				},
			};
			api.mockUtils.mockPeers(peer);
			return peer;
		});
	},
});
