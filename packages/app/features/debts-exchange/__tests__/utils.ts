import type { Locator } from "@playwright/test";

import type { Fixtures as DebtsGroupFixtures } from "~app/components/app/__tests__/debts-group.utils";
import { withFixtures as withDebtsGroupFixtures } from "~app/components/app/__tests__/debts-group.utils";
import type { UsersId } from "~db";
import { test as originalTest } from "~tests/frontend/fixtures";

import type { GenerateDebts, GenerateUser } from "./generators";
import { defaultGenerateDebts, defaultGenerateUser } from "./generators";

type Fixtures = DebtsGroupFixtures & {
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
};

export const test = withDebtsGroupFixtures(
	originalTest.extend<Fixtures>({
		mockBase: ({ api, faker }, use) =>
			use(({ generateUser = defaultGenerateUser } = {}) => {
				api.mockUtils.auth({
					account: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
						verified: true,
						avatarUrl: undefined,
						role: undefined,
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
			use(
				page.locator("a[role='button'][title='Exchange all to one currency']"),
			),
		exchangeSpecificButton: ({ page }, use) =>
			use(page.locator("a[role='button'][title='Exchange specific currency']")),
	}),
);
