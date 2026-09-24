import type { Locator } from "@playwright/test";
import assert from "node:assert";

import type { PeerId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

type Fixtures = {
	mockBase: () => Promise<{ targetPeer: ReturnType<GeneratePeers>[number] }>;
	openPeerScreen: (
		id: PeerId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	peerPreview: Locator;
	nameInput: Locator;
	saveNameButton: Locator;
	addPublicNameButton: Locator;
	publicNameInput: Locator;
	savePublicNameButton: Locator;
	removePublicNameButton: Locator;
	connectButton: Locator;
	connectionEmailInput: Locator;
	linkButton: Locator;
	unlinkButton: Locator;
	cancelRequestButton: Locator;
	outboundRequestInput: Locator;
	removePeerButton: Locator;
	removePeerDialog: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage();
			const [targetPeer] = defaultGeneratePeers({ faker, amount: 1 });
			assert.ok(targetPeer);
			api.mockUtils.mockPeers(targetPeer);
			return { targetPeer };
		}),

	openPeerScreen: ({ page, awaitCacheKey }, use) =>
		use(async (id, { awaitCache = true } = {}) => {
			await page.navigate({ to: "/peers/$id", params: { id } });
			if (awaitCache) {
				await awaitCacheKey("peers.get");
			}
		}),

	peerPreview: ({ page }, use) => use(page.getByTestId("peer")),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Peer name" })),
	saveNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save peer name" })),

	addPublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add public name" })),
	publicNameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Public peer name" })),
	savePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save peer public name" })),
	removePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove peer public name" })),

	connectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Connect to a someone's account" })),
	connectionEmailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),
	linkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Link peer to email" })),
	unlinkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Unlink peer from email" })),
	cancelRequestButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Cancel request" })),
	outboundRequestInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Outbound request" })),

	removePeerButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove peer" })),
	removePeerDialog: ({ modal }, use) => use(modal("Remove modal")),
});
