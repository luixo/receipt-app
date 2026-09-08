import type { Locator } from "@playwright/test";
import { test as originalTest } from "@playwright/test";

export type Fixtures = {
	addUserModal: Locator;
	addUserNameInput: Locator;
	addUserCloseButton: Locator;
	addUserSubmitButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	addUserModal: ({ page }, use) => use(page.getByTestId("add-user")),
	addUserNameInput: ({ addUserModal }, use) =>
		use(addUserModal.getByRole("textbox", { name: "User name" })),
	addUserCloseButton: ({ addUserModal }, use) =>
		use(addUserModal.getByRole("button", { name: "Close" })),
	addUserSubmitButton: ({ addUserModal }, use) =>
		use(addUserModal.getByRole("button", { name: "Add user" })),
});
