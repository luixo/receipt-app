import type { Locator } from "@playwright/test";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<
		{
			topCurrencies: TRPCQueryOutput<"currency.top">;
		} & Awaited<
			ReturnType<
				ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
			>
		>
	>;
	addButton: Locator;
	nameInput: Locator;
	nameInputWrapper: Locator;
	dateInput: Locator;
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
				topCurrencies.toSorted((a, b) => a.count - b.count),
			);
			return { topCurrencies, ...auth };
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
