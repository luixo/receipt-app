import type { Locator } from "@playwright/test";

import { test as originalTest } from "@tests/frontend/fixtures";

type Fields = {
	email: Locator;
	name: Locator;
	password: Locator;
	passwordRetype: Locator;
};

type Fixtures = {
	registerButton: Locator;
	fields: Fields;
	fillValidFields: () => Promise<void>;
	fillInvalidFields: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	registerButton: ({ page }, use) => use(page.locator("button[type=submit]")),

	fields: ({ page }, use) =>
		use({
			email: page.locator('input[name="email"]'),
			name: page.locator('input[name="name"]'),
			password: page.locator('input[name="password"]'),
			passwordRetype: page.locator('input[name="passwordRetype"]'),
		}),

	fillValidFields: ({ fields }, use) =>
		use(async () => {
			await fields.email.fill("test@mail.ru");
			await fields.name.fill("Test name");
			await fields.password.fill("strong-password");
			await fields.passwordRetype.fill("strong-password");
		}),

	fillInvalidFields: ({ fields }, use) =>
		use(async () => {
			// Length is longer than expected
			await fields.email.fill(`${"test".repeat(100)}`);
			// Length is shorter than expected
			await fields.name.fill("t");
			// Password is shorter than expected
			await fields.password.fill("test");
			// Passwords do not match
			await fields.passwordRetype.fill("test2");
		}),
});
