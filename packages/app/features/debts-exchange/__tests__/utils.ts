import { type Locator, mergeTests } from "@playwright/test";

import type { Fixtures as DebtsGroupFixtures } from "~app/components/app/__tests__/debts-group.utils";
import { debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import type { UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
import {
	type GenerateDebts,
	defaultGenerateDebts,
} from "~tests/frontend/generators/debts";
import {
	type GenerateUsers,
	defaultGenerateUsers,
} from "~tests/frontend/generators/users";

type Fixtures = DebtsGroupFixtures & {
	mockBase: () => {
		user: ReturnType<GenerateUsers>[number];
	};
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => {
		debts: ReturnType<GenerateDebts>;
		user: ReturnType<GenerateUsers>[number];
	};
	openDebtsExchangeScreen: (
		userId: UsersId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	exchangeAllToOneButton: Locator;
	exchangeSpecificButton: Locator;
};

export const test = mergeTests(
	debtsGroupFixture,
	originalTest.extend<Fixtures>({
		mockBase: ({ api, faker }, use) =>
			use(() => {
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
				const [user] = defaultGenerateUsers({ faker, amount: 1 });
				api.mock("users.get", user);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return { user: user! };
			}),
		mockDebts: ({ api, faker, mockBase }, use) =>
			use(({ generateDebts = defaultGenerateDebts } = {}) => {
				const { user } = mockBase();
				const debts = generateDebts({ faker, amount: { min: 3, max: 6 } });
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
