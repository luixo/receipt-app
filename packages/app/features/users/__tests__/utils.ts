import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: (options?: { generateUsers?: GenerateUsers }) => Promise<{
		users: ReturnType<GenerateUsers>;
	}>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async ({ generateUsers = defaultGenerateUsers } = {}) => {
			const auth = await api.mockUtils.authPage();
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
});
