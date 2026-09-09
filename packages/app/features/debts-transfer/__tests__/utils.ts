import type { Locator } from "@playwright/test";
import { mergeTests } from "@playwright/test";
import assert from "node:assert";
import { entries } from "remeda";

import { test as usersSuggestFixture } from "~app/components/app/__tests__/users-suggest.utils";
import { getCurrencySymbol } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import type { UserId } from "~db/ids";
import { localSettings } from "~tests/frontend/consts";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import type { GenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => Promise<{
		fromUser: ReturnType<GenerateUsers>[number];
		toUser: ReturnType<GenerateUsers>[number];
	}>;
	mockDebtsTransfer: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debts: ReturnType<GenerateDebts>;
		fromUser: ReturnType<GenerateUsers>[number];
		toUser: ReturnType<GenerateUsers>[number];
	}>;
	openDebtsTransferScreen: (options?: {
		fromUserId?: UserId;
		toUserId?: UserId;
		awaitCache?: boolean;
	}) => Promise<void>;
	fromUserSuggestInput: Locator;
	toUserSuggestInput: Locator;
	submitButton: Locator;
	addCurrencyButton: Locator;
	currencyPickerDialog: Locator;
	allMaxButton: Locator;
	amountInput: (currencyCode: CurrencyCode) => Locator;
	transferForm: Locator;
};

const mergedTest = mergeTests(originalTest, usersSuggestFixture);

export const test = mergedTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			await api.mockUtils.authPage();
			const [fromUser, toUser] = defaultGenerateUsers({ faker, amount: 2 });
			assert.ok(fromUser);
			assert.ok(toUser);
			api.mockFirst("users.suggestTop", { items: [fromUser.id, toUser.id] });
			api.mockFirst("users.suggest", { cursor: 0, count: 0, items: [] });
			api.mockUtils.mockUsers(fromUser, toUser);
			return { fromUser, toUser };
		}),

	mockDebtsTransfer: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { fromUser, toUser } = await mockBase();
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: fromUser.id,
			});
			const aggregatedDebts = entries(
				debts.reduce<Record<CurrencyCode, number>>(
					(acc, { currencyCode, amount }) => ({
						...acc,
						[currencyCode]: (acc[currencyCode] || 0) + amount,
					}),
					{},
				),
			).map(([currencyCode, sum]) => ({ currencyCode, sum }));
			api.mockFirst("debts.getAllUser", { items: aggregatedDebts });
			api.mockUtils.mockUsers(fromUser, toUser);
			return { debts, fromUser, toUser };
		}),

	openDebtsTransferScreen: ({ page, awaitCacheKey }, use) =>
		use(async ({ fromUserId, toUserId, awaitCache = true } = {}) => {
			await page.navigate({
				to: "/debts/transfer",
				search: { to: toUserId, from: fromUserId },
			});
			if (awaitCache) {
				if (fromUserId || toUserId) {
					await awaitCacheKey("users.get", { success: 2 });
				}
				if (fromUserId) {
					await awaitCacheKey("debts.getAllUser");
				}
			}
		}),

	fromUserSuggestInput: ({ page }, use) => use(page.getByLabel("From")),

	toUserSuggestInput: ({ page }, use) => use(page.getByLabel("To")),

	submitButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Transfer debt(s)" })),

	addCurrencyButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add a currency" })),

	currencyPickerDialog: ({ page }, use) =>
		use(page.getByTestId("currencies-picker")),

	allMaxButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "All max" })),

	amountInput: ({ page }, use) =>
		use((currencyCode) =>
			page.getByRole("textbox", {
				name: getCurrencySymbol(localSettings.locale, currencyCode),
			}),
		),

	transferForm: ({ page }, use) => use(page.getByTestId("debts-transfer-form")),
});
