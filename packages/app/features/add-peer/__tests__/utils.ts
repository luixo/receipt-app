import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

type Fixtures = {
	addButton: Locator;
	nameInput: Locator;
	nameInputWrapper: Locator;
	emailInput: Locator;
	emailInputWrapper: Locator;
	fillValidForm: (name?: string) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	addButton: ({ page }, use) =>
		use(page.getByRole("button", { name: /Add peer/ })),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Peer name" })),
	nameInputWrapper: ({ page, nameInput }, use) =>
		use(page.getByTestId("input-wrapper").filter({ has: nameInput })),

	emailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),
	emailInputWrapper: ({ page, emailInput }, use) =>
		use(page.getByTestId("input-wrapper").filter({ has: emailInput })),

	fillValidForm: ({ nameInput }, use) =>
		use(async (name = "Test peer") => {
			await nameInput.fill(name);
		}),
});
