import type { Locator } from "@playwright/test";
import { test as originalTest } from "@playwright/test";

export type Fixtures = {
	addPeerModal: Locator;
	addPeerNameInput: Locator;
	addPeerCloseButton: Locator;
	addPeerSubmitButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	addPeerModal: ({ page }, use) => use(page.getByTestId("add-peer")),
	addPeerNameInput: ({ addPeerModal }, use) =>
		use(addPeerModal.getByRole("textbox", { name: "Peer name" })),
	addPeerCloseButton: ({ addPeerModal }, use) =>
		use(addPeerModal.getByRole("button", { name: "Close" })),
	addPeerSubmitButton: ({ addPeerModal }, use) =>
		use(addPeerModal.getByRole("button", { name: "Add peer" })),
});
