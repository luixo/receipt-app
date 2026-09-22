import type { Locator } from "@playwright/test";

import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test as peersTest } from "./utils";

type Fixtures = {
	mockPagedPeers: () => Promise<void>;
	peerRow: Locator;
	peerSkeleton: Locator;
	headerAside: Locator;
	addPeerButton: Locator;
	connectionsButton: Locator;
	connectionsBadge: Locator;
	emailVerificationCard: Locator;
};

export const test = peersTest.extend<Fixtures>({
	mockPagedPeers: ({ mockBase }, use) =>
		use(async () => {
			await mockBase({
				generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 25 }),
			});
		}),

	peerRow: ({ page }, use) => use(page.getByTestId("peer")),

	peerSkeleton: ({ page }, use) => use(page.getByTestId("peer-skeleton")),

	headerAside: ({ page }, use) => use(page.getByTestId("header-aside")),

	addPeerButton: ({ headerAside }, use) =>
		use(headerAside.getByRole("button", { name: "Add peer" })),

	connectionsButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Connection intentions" })),

	connectionsBadge: ({ headerAside }, use) =>
		use(headerAside.getByTestId("badge")),

	emailVerificationCard: ({ page }, use) =>
		use(page.getByTestId("email-verification-card")),
});
