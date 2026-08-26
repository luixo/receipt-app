import assert from "node:assert";

import type { DebtId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import { getNow } from "~utils/date";

type Fixtures = {
	mockBase: () => Promise<{
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	mockDebt: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debt: ReturnType<GenerateDebts>[number];
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	openDebtScreen: (
		debtId: DebtId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ page, api, faker }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage({ page });
			const [user] = defaultGenerateUsers({ faker, amount: 1 });
			assert(user);
			api.mockUtils.mockUsers(user);
			return { ...auth, debtUser: user };
		}),

	mockDebt: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const baseMock = await mockBase();
			const [debt] = generateDebts({
				faker,
				amount: 1,
				userId: baseMock.debtUser.id,
			});
			assert(debt);
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				if (lookupId !== debt.id) {
					throw new Error(`Unexpected debt id in "debts.get": ${lookupId}`);
				}
				return debt;
			});
			api.mockFirst("debts.update", () => ({
				updatedAt: getNow.zonedDateTime(),
				reverseUpdated: false,
			}));
			return { debt, ...baseMock };
		}),

	openDebtScreen: ({ page, awaitCacheKey }, use) =>
		use(async (debtId, { awaitCache = true } = {}) => {
			await page.goto(`/debts/${debtId}`);
			if (awaitCache) {
				await awaitCacheKey("debts.get");
				await awaitCacheKey("users.get");
			}
		}),
});
