import type { Locator } from "@playwright/test";
import assert from "node:assert";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebtIntentions } from "~tests/frontend/generators/debts";
import { defaultGenerateDebtIntentions } from "~tests/frontend/generators/debts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockDebts: (options: {
		generateDebtIntentions?: GenerateDebtIntentions;
	}) => Promise<{
		debtIntenions: ReturnType<GenerateDebtIntentions>;
		debtUser: ReturnType<GenerateUsers>[number];
	}>;
	acceptButton: Locator;
	acceptAndEditButton: Locator;
	rejectButton: Locator;
	inboundDebtIntentionRow: Locator;
	acceptAllIntentionButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockDebts: ({ api, faker }, use) =>
		use(async ({ generateDebtIntentions = defaultGenerateDebtIntentions }) => {
			await api.mockUtils.authPage();
			const [debtUser] = defaultGenerateUsers({ faker, amount: 1 });
			assert.ok(debtUser);
			api.mockUtils.mockUsers(debtUser);
			const debtIntenions = generateDebtIntentions({
				faker,
				amount: { min: 3, max: 6 },
				userId: debtUser.id,
			});
			api.mockFirst("debtIntentions.getAll", {
				items: debtIntenions,
			});
			api.mockFirst("debts.getAllUser", { items: [] });
			return { debtIntenions, debtUser };
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
