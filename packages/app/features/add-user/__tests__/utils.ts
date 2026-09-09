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
		use(page.locator("button[type=submit]", { hasText: "Add user" })),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "User name" })),

	emailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),

	fillValidForm: ({ nameInput }, use) =>
		use(async (name = "Test user") => {
			await nameInput.fill(name);
		}),
});
