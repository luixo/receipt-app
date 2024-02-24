import type { Locator } from "@playwright/test";

import { test as originalTest } from "@tests/frontend/fixtures";
import type { UsersId } from "next-app/db/models";

import type { GenerateDebts, GenerateUser } from "./generators";
import { defaultGenerateDebts, defaultGenerateUser } from "./generators";

type Fixtures = {
	mockBase: (options?: { generateUser?: GenerateUser }) => {
		user: ReturnType<GenerateUser>;
	};
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => {
		debts: ReturnType<GenerateDebts>;
		user: ReturnType<GenerateUser>;
	};
	openDebtsExchangeScreen: (
		userId: UsersId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	exchangeAllToOneButton: Locator;
	exchangeSpecificButton: Locator;
	debtsGroup: Locator;
	debtsGroupElement: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(({ generateUser = defaultGenerateUser } = {}) => {
			api.mockUtils.auth({
				account: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					verified: true,
					avatarUrl: undefined,
				},
				user: { name: faker.person.firstName() },
			});
			api.mockUtils.currencyList();
			const user = generateUser({ faker });
			api.mock("users.get", user);
			return { user };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(({ generateDebts = defaultGenerateDebts } = {}) => {
			const { user } = mockBase();
			const debts = generateDebts({ faker });
			api.mock("debts.getUser", debts);
			return { debts, user };
		}),

	openDebtsExchangeScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true } = {}) => {
			await page.goto(`/debts/user/${userId}/exchange/`);
			if (awaitCache) {
				await awaitCacheKey(["users.get", "debts.getUser"]);
			}
		}),

	exchangeAllToOneButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange all to one currency']")),
	exchangeSpecificButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange specific currency']")),
	debtsGroup: ({ page }, use) => use(page.getByTestId("debts-group")),
	debtsGroupElement: ({ page }, use) =>
		use(page.getByTestId("debts-group-element")),
});
