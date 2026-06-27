import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

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
	registerButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Register" })),

	fields: ({ page }, use) =>
		use({
			email: page.getByRole("textbox", { name: "Email" }),
			name: page.getByRole("textbox", { name: "Name" }),
			password: page.getByRole("textbox", { name: "Password", exact: true }),
			passwordRetype: page.getByRole("textbox", {
				name: "Retype new password",
				exact: true,
			}),
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
			await fields.email.fill("this-is-not-email-address");
			// Length is shorter than expected
			await fields.name.fill("t");
			// Password is shorter than expected
			await fields.password.fill("test");
			// Passwords do not match
			await fields.passwordRetype.fill("test2");
		}),
});
