import type { Locator } from "@playwright/test";
import assert from "node:assert";

import type { UserId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => Promise<{ targetUser: ReturnType<GenerateUsers>[number] }>;
	openUserScreen: (
		id: UserId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	userPreview: Locator;
	nameInput: Locator;
	saveNameButton: Locator;
	addPublicNameButton: Locator;
	publicNameInput: Locator;
	savePublicNameButton: Locator;
	removePublicNameButton: Locator;
	connectButton: Locator;
	connectionEmailInput: Locator;
	linkButton: Locator;
	unlinkButton: Locator;
	cancelRequestButton: Locator;
	outboundRequestInput: Locator;
	removeUserButton: Locator;
	removeUserDialog: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ page, api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage({ page });
			const [targetUser] = defaultGenerateUsers({ faker, amount: 1 });
			assert.ok(targetUser);
			api.mockUtils.mockUsers(targetUser);
			return { targetUser };
		}),

	openUserScreen: ({ page, awaitCacheKey }, use) =>
		use(async (id, { awaitCache = true } = {}) => {
			await page.goto(`/users/${id}`);
			if (awaitCache) {
				await awaitCacheKey("users.get");
			}
		}),

	userPreview: ({ page }, use) => use(page.getByTestId("user")),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "User name" })),
	saveNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save user name" })),

	addPublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add public name" })),
	publicNameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Public user name" })),
	savePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save user public name" })),
	removePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove user public name" })),

	connectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Connect to an account" })),
	connectionEmailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),
	linkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Link user to email" })),
	unlinkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Unlink user from email" })),
	cancelRequestButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Cancel request" })),
	outboundRequestInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Outbound request" })),

	removeUserButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove user" })),
	removeUserDialog: ({ modal }, use) => use(modal("Remove modal")),
});
