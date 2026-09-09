import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";

type Fixtures = {
	loginButton: Locator;
	forgotPasswordButton: Locator;
	resetSubmitButton: Locator;
	resetModal: Locator;
	fields: {
		email: Locator;
		password: Locator;
	};
	resetEmailField: Locator;
};

export const test = originalTest.extend<Fixtures>({
	loginButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Login" })),

	forgotPasswordButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Forgot password?" })),

	resetModal: ({ modal }, use) => use(modal("Forgot password")),

	resetSubmitButton: ({ resetModal }, use) =>
		use(
			resetModal.getByRole("button", { name: "Send email with a reset link" }),
		),

	resetEmailField: ({ resetModal }, use) =>
		use(resetModal.getByRole("textbox", { name: "Email" })),

	fields: ({ page }, use) =>
		use({
			email: page.getByRole("textbox", { name: "Email" }),
			password: page.getByRole("textbox", { name: "Password" }),
		}),
});
