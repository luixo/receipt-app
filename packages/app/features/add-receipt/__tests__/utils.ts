import type { Locator } from "@playwright/test";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";

type Fixtures = {
	mockBase: () => Promise<{
		topCurrencies: TRPCQueryOutput<"currency.top">;
	}>;
	addButton: Locator;
	nameInput: Locator;
	nameInputWrapper: Locator;
	dateInput: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker, page }, use) =>
		use(async () => {
			await api.mockUtils.authPage({ page });
			const topCurrencies = generateAmount(faker, 5, () => ({
				currencyCode: generateCurrencyCode(faker),
				count: Number(faker.number.int(100)),
			}));
			api.mockFirst("currency.top", topCurrencies);
			return { topCurrencies };
		}),

	addButton: ({ page }, use) =>
		use(
			page.locator("button[type=submit]", {
				hasText: "Add receipt",
			}),
		),

	nameInput: ({ page }, use) => use(page.locator('input[name="name"]')),
	nameInputWrapper: ({ page, nameInput }, use) =>
		use(page.locator('[data-slot="base"]', { has: nameInput })),
	dateInput: ({ page }, use) => use(page.locator('input[name="issued-date"]')),
});
