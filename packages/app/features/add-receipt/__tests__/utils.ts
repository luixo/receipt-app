import type { Locator } from "@playwright/test";

import {
	getItemCards,
	getItemNameInput,
	getItemPriceInput,
	getItemQuantityInput,
} from "~app/features/receipt-components/__tests__/receipt-item.utils";
import type { Currencies, Peer } from "~app/trpc-types";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	generateAmount,
	generateCurrencyCode,
} from "~tests/frontend/generators/utils";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<
		{
			topCurrencies: Currencies;
			peers: Peer[];
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
	addItemButton: Locator;
	addItemForm: Locator;
	itemName: Locator;
	itemPrice: Locator;
	itemQuantity: Locator;
	saveItemButton: Locator;
	itemCards: Locator;
	warningSection: Locator;
	participantsPicker: Locator;
	participantsPreview: Locator;
	participantRows: Locator;
	participantRow: (name: string) => Locator;
	participantSuggestion: Locator;
	fillForm: (item: {
		name: string;
		price: number;
		quantity?: number;
	}) => Promise<void>;
	selectParticipant: (name: string) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			const topCurrencies = generateAmount(faker, 5, () => ({
				currencyCode: generateCurrencyCode(faker),
				count: faker.number.int(100),
			}));
			api.mockFirst("currency.top", {
				items: topCurrencies.toSorted((a, b) => a.count - b.count),
			});
			const peers = defaultGeneratePeers({ faker, amount: { min: 2, max: 5 } });
			api.mockUtils.mockPeers(...peers);
			api.mockFirst("peers.suggestTop", ({ input }) => ({
				items: peers
					.map(({ id }) => id)
					.filter((id) => !input.filterIds?.includes(id)),
			}));
			return { topCurrencies, peers, ...auth };
		}),

	addButton: ({ page }, use) =>
		use(
			page.locator("button[type=submit]", {
				hasText: "Add receipt",
			}),
		),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Receipt name*" })),
	nameInputWrapper: ({ page, nameInput }, use) =>
		use(page.locator('[data-slot="base"]', { has: nameInput })),
	dateInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Issued on" })),
	addItemButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Item", exact: true })),
	addItemForm: ({ page }, use) =>
		use(page.getByRole("form", { name: "Add receipt item" })),
	itemName: ({ addItemForm }, use) => use(getItemNameInput(addItemForm)),
	itemPrice: ({ addItemForm }, use) => use(getItemPriceInput(addItemForm)),
	itemQuantity: ({ addItemForm }, use) =>
		use(getItemQuantityInput(addItemForm)),
	saveItemButton: ({ addItemForm }, use) =>
		use(addItemForm.getByRole("button", { name: /Save/ })),
	itemCards: ({ page }, use) => use(getItemCards(page)),
	warningSection: ({ page }, use) =>
		use(page.getByTestId("receipt-empty-items")),
	participantsPicker: ({ page }, use) =>
		use(page.getByTestId("participants-picker")),
	participantsPreview: ({ page }, use) =>
		use(page.getByTestId("participants-preview")),
	participantRows: ({ participantsPicker }, use) =>
		use(participantsPicker.getByTestId("participant-row")),
	participantRow: ({ participantRows }, use) =>
		use((name) => participantRows.filter({ hasText: name })),
	participantSuggestion: ({ participantsPicker }, use) =>
		use(participantsPicker.getByTestId("peers-suggest")),
	fillForm: ({ itemName, itemPrice, itemQuantity }, use) =>
		use(async ({ name, price, quantity = 1 }) => {
			await itemName.fill(name);
			await itemPrice.fill(String(price));
			await itemPrice.press("Tab");
			await itemQuantity.fill(String(quantity));
			await itemQuantity.press("Tab");
		}),
	selectParticipant: ({ participantSuggestion, page }, use) =>
		use(async (name) => {
			await participantSuggestion
				.getByRole("button", { name: "Show suggestions" })
				.click();
			await page
				.getByRole("option", { includeHidden: true })
				.filter({ hasText: name, visible: true })
				.click();
			await participantSuggestion.getByRole("combobox").press("Escape");
		}),
});
