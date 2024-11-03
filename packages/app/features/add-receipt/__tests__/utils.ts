import type { Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";

type Fixtures = {
	mockBase: () => {
		user: ReturnType<GenerateUsers>[number];
		currencies: TRPCQueryOutput<"currency.topReceipts">;
	};
	addButton: Locator;
	nameInput: Locator;
	nameInputWrapper: Locator;
	dateInput: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(() => {
			api.mockUtils.authPage();
			api.mockUtils.currencyList();
			const topCurrencies = generateAmount(faker, 5, () => ({
				currencyCode: generateCurrencyCode(faker),
				count: Number(faker.number.int(100)),
			}));
			api.mock("currency.topReceipts", topCurrencies);
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
			const [user] = defaultGenerateUsers({ faker, amount: 1 });
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const sureUser = user!;
			api.mock("users.get", ({ input }) => {
				if (input.id !== sureUser.id) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `User id "${input.id}" does not exist.`,
					});
				}
				return sureUser;
			});
			return { user: sureUser, currencies: topCurrencies };
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
