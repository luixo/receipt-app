import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<
		Awaited<
			ReturnType<
				ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
			>
		>
	>;
	addButton: Locator;
	nameInput: Locator;
	emailInput: Locator;
	fillValidForm: (name?: string) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, page }, use) =>
		use(async () => api.mockUtils.authPage({ page })),

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
