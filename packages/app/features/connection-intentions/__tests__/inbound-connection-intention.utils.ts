import type { Locator } from "@playwright/test";

import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test as originalTest } from "./utils";

type Fixtures = {
	rejectButton: Locator;
	confirmDialog: Locator;
	confirmYesButton: Locator;
	confirmNoButton: Locator;
	mockSuggestedUsers: (
		amount?: number,
	) => ReturnType<typeof defaultGenerateUsers>;
};

export const test = originalTest.extend<Fixtures>({
	rejectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reject" })),
	confirmDialog: ({ page, modal }, use) => use(modal("Connect an account")),
	confirmYesButton: ({ confirmDialog }, use) =>
		use(confirmDialog.getByRole("button", { name: "Yes" })),
	confirmNoButton: ({ confirmDialog }, use) =>
		use(confirmDialog.getByRole("button", { name: "No" })),
	mockSuggestedUsers: ({ api, faker }, use) =>
		use((amount = 1) => {
			const users = defaultGenerateUsers({ faker, amount });
			api.mockUtils.mockUsers(...users);
			api.mockFirst("users.suggestTop", {
				items: users.map((user) => user.id),
			});
			return users;
		}),
});
