import type { Locator } from "@playwright/test";

import { test as debtsTest } from "./utils";

type Fixtures = {
	mockPagedUsers: () => Promise<void>;
	showResolvedDebtsSwitch: Locator;
	debtsPagination: Locator;
	userDebtsPreview: Locator;
	debtIntentionsButton: Locator;
};

export const test = debtsTest.extend<Fixtures>({
	mockPagedUsers: ({ api, faker, mockBase }, use) =>
		use(async () => {
			const userIds = Array.from({ length: 25 }, () => faker.string.uuid());
			const users = userIds.map((id) => ({
				id,
				name: faker.person.fullName(),
			}));
			await mockBase();
			api.mockFirst("debts.getAllUser", { items: [] });
			api.mockFirst("debts.getUsersPaged", ({ input: { limit, cursor } }) => ({
				count: userIds.length,
				cursor,
				items: userIds.slice(cursor, cursor + limit),
			}));
			api.mockFirst("debts.getByUserPaged", {
				cursor: 0,
				count: 0,
				items: [],
			});
			api.mockFirst("users.get", ({ input, next }) => {
				const user = users.find((u) => u.id === input.id);
				if (!user) {
					return next();
				}
				return {
					id: user.id,
					name: user.name,
					publicName: undefined,
					connectedAccount: undefined,
				};
			});
		}),

	showResolvedDebtsSwitch: ({ page }, use) =>
		use(page.getByTestId("show-resolved-debts-switch")),

	debtsPagination: ({ page }, use) =>
		use(page.getByRole("navigation", { name: /pagination/i })),

	userDebtsPreview: ({ page }, use) =>
		use(page.getByTestId("user-debts-preview")),

	debtIntentionsButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Intentions" })),
});
