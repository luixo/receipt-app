import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockDebts: (options: { generateDebts?: GenerateDebts }) => {
		debts: ReturnType<GenerateDebts>;
	};
	openDebtIntentions: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockDebts: ({ api, faker }, use) =>
		use(({ generateDebts = defaultGenerateDebts }) => {
			const [other] = defaultGenerateUsers({ faker, amount: 1 });
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const debtUser = other!;
			api.mockUtils.mockUsers(debtUser);
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: debtUser.id,
			});
			api.mockFirst(
				"debtIntentions.getAll",
				debts.map((debt) => ({
					id: debt.id,
					userId: debt.userId,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					updatedAt: debt.updatedAt,
					note: debt.note,
				})),
			);
			return { debts };
		}),

	openDebtIntentions: ({ page, awaitCacheKey }, use) =>
		use(async () => {
			await page.goto(`/debts/intentions`);
			await awaitCacheKey("debtIntentions.getAll");
		}),
});
