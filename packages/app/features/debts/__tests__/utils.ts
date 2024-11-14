import { TRPCError } from "@trpc/server";
import { entries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: (options?: { generateUsers?: GenerateUsers }) => {
		debtUser: ReturnType<GenerateUsers>[number];
	};
	mockDebts: (options?: { generateDebts?: GenerateDebts }) => {
		debts: ReturnType<GenerateDebts>;
		debtUser: ReturnType<GenerateUsers>[number];
	};
	openUserDebtsScreen: (
		userId: UsersId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(({ generateUsers = defaultGenerateUsers } = {}) => {
			api.mockUtils.authPage();
			const users = generateUsers({ faker, amount: 1 });
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const debtUser = users[0]!;
			api.mockFirst(
				"users.get",
				({ input, next }) =>
					users.find((user) => user.id === input.id) || next(),
			);
			return { debtUser };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(({ generateDebts = defaultGenerateDebts } = {}) => {
			const { debtUser } = mockBase();
			const debts = generateDebts({ faker, userId: debtUser.id });
			api.mockFirst("debts.getByUsers", [
				{
					userId: debtUser.id,
					unsyncedDebtsAmount: 0,
					debts: entries(
						debts.reduce<Record<CurrencyCode, number>>(
							(acc, { currencyCode, amount }) => ({
								...acc,
								[currencyCode]: (acc[currencyCode] || 0) + amount,
							}),
							{},
						),
					).map(([currencyCode, sum]) => ({ currencyCode, sum })),
				},
			]);
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
				return matchedDebt;
			});
			return { debts, debtUser };
		}),

	openUserDebtsScreen: ({ page, awaitCacheKey }, use) =>
		use(async (userId, { awaitCache = true, awaitDebts = 0 } = {}) => {
			await page.goto(`/debts/user/${userId}/`);
			if (awaitCache) {
				await awaitCacheKey("users.get");
				await awaitCacheKey("debts.getIdsByUser");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),
});
