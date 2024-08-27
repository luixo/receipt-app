import { type Locator, mergeTests } from "@playwright/test";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
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

type Fixtures = {
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
	originalTest.extend<Fixtures>({
		mockBase: ({ api, faker }, use) =>
			use(() => {
				api.mockUtils.authPage();
				api.mock("account.get", {
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
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const sureUser = user!;
				api.mock("users.get", sureUser);
				return { user: sureUser };
			}),
		mockDebts: ({ api, faker, mockBase }, use) =>
			use(({ generateDebts = defaultGenerateDebts } = {}) => {
				const { user } = mockBase();
				const debts = generateDebts({
					faker,
					amount: { min: 3, max: 6 },
					userId: user.id,
				});
				api.mock("debts.getUser", debts);
				return { debts, user };
			}),

		openDebtsExchangeScreen: ({ page, awaitCacheKey }, use) =>
			use(async (userId, { awaitCache = true } = {}) => {
				await page.goto(`/debts/user/${userId}/exchange/`);
				if (awaitCache) {
					await awaitCacheKey("users.get");
					await awaitCacheKey("debts.getUser");
				}
			}),

		exchangeAllToOneButton: ({ page }, use) =>
			use(
				page.locator("a[role='button'][title='Exchange all to one currency']"),
			),
		exchangeSpecificButton: ({ page }, use) =>
			use(page.locator("a[role='button'][title='Exchange specific currency']")),
	}),
	debtsGroupFixture,
);
