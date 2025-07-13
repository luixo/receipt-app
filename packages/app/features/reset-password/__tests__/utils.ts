import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

type Fields = {
	password: Locator;
	passwordRetype: Locator;
};

type Fixtures = {
	resetPasswordButton: Locator;
	fields: Fields;
	fillValidFields: () => Promise<void>;
	fillInvalidFields: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	resetPasswordButton: ({ page }, use) =>
		use(page.locator("button[type=submit]")),

	fields: ({ page }, use) =>
		use({
			password: page.getByLabel("New password", { exact: true }),
			passwordRetype: page.getByLabel("Retype new password", { exact: true }),
		}),

	fillValidFields: ({ fields }, use) =>
		use(async () => {
			await fields.password.fill("strong-password");
			await fields.passwordRetype.fill("strong-password");
		}),

	fillInvalidFields: ({ fields }, use) =>
		use(async () => {
			// Password is shorter than expected
			await fields.password.fill("test");
			// Passwords do not match
			await fields.passwordRetype.fill("test2");
		}),
});
