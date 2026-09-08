import type { Locator } from "@playwright/test";
import assert from "node:assert";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockDebts: (options: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	openDebtIntentions: () => Promise<void>;
	acceptButton: Locator;
	acceptAndEditButton: Locator;
	rejectButton: Locator;
	inboundDebtIntentionRow: Locator;
	acceptAllIntentionButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockDebts: ({ api, page, faker }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts }) => {
			await api.mockUtils.authPage({ page });
			const [debtUser] = defaultGenerateUsers({ faker, amount: 1 });
			assert.ok(debtUser);
			api.mockUtils.mockUsers(debtUser);
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: debtUser.id,
			});
			api.mockFirst("debtIntentions.getAll", {
				items: debts.map((debt) => ({
					id: debt.id,
					userId: debt.userId,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					updatedAt: debt.updatedAt,
					note: debt.note,
				})),
			});
			api.mockFirst("debts.getAllUser", { items: [] });
			return { debts, debtUser };
		}),

	openDebtIntentions: ({ page, awaitCacheKey }, use) =>
		use(async () => {
			await page.goto(`/debts/intentions`);
			await awaitCacheKey("debtIntentions.getAll");
		}),

	acceptButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept", exact: true })),
	acceptAndEditButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept and edit" })),
	rejectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reject" })),
	inboundDebtIntentionRow: ({ page }, use) =>
		use(page.getByTestId("inbound-debt-intention")),
	acceptAllIntentionButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Accept all intentions" })),
});
