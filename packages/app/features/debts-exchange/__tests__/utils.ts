import { type Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";

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
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
	exchangeAllToOneButton: Locator;
	exchangeSpecificButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(() => {
			api.mockUtils.authPage();
			api.mockFirst("account.get", {
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
			api.mockFirst("users.get", sureUser);
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
			api.mockFirst(
				"debts.getIdsByUser",
				debts.map(({ id, timestamp }) => ({ id, timestamp })),
			);
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				const matchedDebt = debts.find((debt) => debt.id === lookupId);
				if (!matchedDebt) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Expected to have debt id "${lookupId}", but none found`,
					});
				}
				return { ...matchedDebt, userId: user.id };
			});
			return { debts, user };
		}),

	openDebtsExchangeScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true, awaitDebts } = {}) => {
			await page.goto(`/debts/user/${userId}/exchange/`);
			if (awaitCache) {
				await awaitCacheKey("users.get");
				await awaitCacheKey("debts.getIdsByUser");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),

	exchangeAllToOneButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange all to one currency']")),
	exchangeSpecificButton: ({ page }, use) =>
		use(page.locator("a[role='button'][title='Exchange specific currency']")),
});
