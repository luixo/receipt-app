import type { Locator } from "@playwright/test";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<
		{
			topCurrencies: TRPCQueryOutput<"currency.top">;
			users: ReturnType<GenerateUsers>;
		} & Awaited<
			ReturnType<
				ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
			>
		>
	>;
	addButton: Locator;
	amountInput: Locator;
	currencyInput: Locator;
	dateInput: Locator;
	noteInput: Locator;
	fillValidForm: (user: TRPCQueryOutput<"users.get">) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker, page }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage({ page });
			const topCurrencies = generateAmount(faker, 5, () => ({
				currencyCode: generateCurrencyCode(faker),
				count: Number(faker.number.int(100)),
			}));
			api.mockFirst(
				"currency.top",
				topCurrencies.toSorted((a, b) => b.count - a.count),
			);
			const users = defaultGenerateUsers({ faker });
			api.mockFirst("users.suggestTop", { items: users.map((u) => u.id) });
			api.mockFirst("users.suggest", { cursor: 0, count: 0, items: [] });
			api.mockUtils.mockUsers(...users);
			return { topCurrencies, users, ...auth };
		}),

	addButton: ({ page }, use) =>
		use(page.locator("button[type=submit]", { hasText: "Add debt" })),

	amountInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Amount" })),

	currencyInput: ({ page }, use) => use(page.locator('input[name="currency"]')),

	dateInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Date" })),

	noteInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Debt note" })),

	fillValidForm: ({ amountInput, noteInput, fillUser }, use) =>
		use(async (user: TRPCQueryOutput<"users.get">) => {
			await fillUser(user);
			await amountInput.fill("10");
			// Tab out to trigger react-aria NumberField's blur/commit
			await amountInput.press("Tab");
			await noteInput.fill("Test debt note");
			// currencyCode: auto-loaded from currency.top — no interaction needed
			// timestamp: defaults to today — no interaction needed
			// direction: defaults to "+" — no interaction needed
		}),
});
