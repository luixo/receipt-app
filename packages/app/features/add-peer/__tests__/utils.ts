import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

type Fixtures = {
	addButton: Locator;
	nameInput: Locator;
	emailInput: Locator;
	fillValidForm: (name?: string) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	addButton: ({ page }, use) =>
		use(page.locator("button[type=submit]", { hasText: "Add peer" })),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Peer name" })),

	emailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),

	fillValidForm: ({ nameInput }, use) =>
		use(async (name = "Test peer") => {
			await nameInput.fill(name);
		}),
});
