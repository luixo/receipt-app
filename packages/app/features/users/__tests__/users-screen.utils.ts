import type { Locator } from "@playwright/test";

import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test as usersTest } from "./utils";

type Fixtures = {
	mockPagedUsers: () => Promise<void>;
	userRow: Locator;
	userSkeleton: Locator;
	headerAside: Locator;
	addUserButton: Locator;
	connectionsButton: Locator;
	connectionsBadge: Locator;
	emailVerificationCard: Locator;
};

export const test = usersTest.extend<Fixtures>({
	mockPagedUsers: ({ mockBase }, use) =>
		use(async () => {
			await mockBase({
				generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 25 }),
			});
		}),

	userRow: ({ page }, use) => use(page.getByTestId("user")),

	userSkeleton: ({ page }, use) => use(page.getByTestId("user-skeleton")),

	headerAside: ({ page }, use) => use(page.getByTestId("header-aside")),

	addUserButton: ({ headerAside }, use) =>
		use(headerAside.getByRole("button", { name: "Add user" })),

	connectionsButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Connection intentions" })),

	connectionsBadge: ({ headerAside }, use) =>
		use(headerAside.getByTestId("badge")),

	emailVerificationCard: ({ page }, use) =>
		use(page.getByTestId("email-verification-card")),
});
