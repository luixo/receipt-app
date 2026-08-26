import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: (options?: { generateUsers?: GenerateUsers }) => Promise<{
		users: ReturnType<GenerateUsers>;
	}>;
	openUsersScreen: (options?: { awaitCache?: boolean }) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ page, api, faker }, use) =>
		use(async ({ generateUsers = defaultGenerateUsers } = {}) => {
			const auth = await api.mockUtils.authPage({ page });
			const users = generateUsers({ faker });
			api.mockUtils.mockUsers(...users);
			api.mockFirst("users.getPaged", ({ input }) => ({
				cursor: input.cursor,
				count: users.length,
				items: users
					.slice(input.cursor, input.cursor + input.limit)
					.map((user) => user.id),
			}));
			return { users, ...auth };
		}),

	openUsersScreen: ({ page, awaitCacheKey }, use) =>
		use(async ({ awaitCache = true } = {}) => {
			await page.goto("/users");
			if (awaitCache) {
				await awaitCacheKey("users.getPaged");
			}
		}),
});
