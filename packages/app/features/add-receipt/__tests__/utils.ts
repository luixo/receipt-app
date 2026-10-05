import type { Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import {
	getItemCards,
	getItemNameInput,
	getItemPriceInput,
	getItemQuantityInput,
} from "~app/features/receipt-components/__tests__/receipt-item.utils";
import type { TRPCMutationInput } from "~app/trpc";
import type { Currencies, Peer } from "~app/trpc-types";
import { expect, test as originalTest } from "~tests/frontend/fixtures";
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
	submitDraft: () => Promise<TRPCMutationInput<"receipts.add">>;
	assertDraftOnly: () => void;
	awaitDraftAutosaves: () => Promise<void>;
	removeDraftConsumer: (
		mode: "zero part" | "deselection",
		name: string,
	) => Promise<void>;
	mockDraft: () => Promise<Awaited<ReturnType<Fixtures["mockBase"]>>>;
};

export const test = originalTest.extend<Fixtures>({
	removeDraftConsumer: ({ page, itemCards }, use) =>
		use(async (mode, name) => {
			const card = itemCards.first();
			if (mode === "zero part") {
				await card.getByRole("button", { name: "1 / 2" }).first().click();
				const input = card.getByRole("textbox", { name: "Item consumer part" });
				await input.fill("0");
				await input.press("Tab");
				await expect(card.getByRole("button", { name: "1 / 2" })).toHaveCount(
					0,
				);
			} else {
				await card.getByRole("button", { name: "Choose consumers" }).click();
				await page
					.getByRole("option", { includeHidden: true })
					.filter({ visible: true, hasText: name })
					.click();
				await page.keyboard.press("Tab");
			}
		}),
	awaitDraftAutosaves: ({ icon }, use) =>
		use(async () => {
			for (const check of await icon("check").all()) {
				await expect(check).toHaveCSS("opacity", "0");
			}
		}),
	mockDraft: (
		{
			mockBase,
			page,
			nameInput,
			addItemButton,
			fillForm,
			saveItemButton,
			selectParticipant,
			participantsPicker,
		},
		use,
	) =>
		use(async () => {
			const base = await mockBase();
			await page.navigate({ to: "/receipts/add" });
			await nameInput.fill("Draft receipt");
			await addItemButton.click();
			await fillForm({ name: "Draft item", price: 12, quantity: 2 });
			await saveItemButton.click();
			await page.getByRole("button", { name: "Add participants" }).click();
			for (const peer of base.peers.slice(0, 2)) {
				await selectParticipant(peer.name);
			}
			await participantsPicker.getByRole("button", { name: "Close" }).click();
			return base;
		}),
	assertDraftOnly: ({ api }, use) =>
		use(() => {
			expect(
				api
					.getActions()
					.filter(([, key]) =>
						/^(?:receiptItems|receiptParticipants|receiptPayers|receiptItemConsumers|receiptItemPayers)\./.test(
							key,
						),
					),
			).toEqual([]);
		}),
	submitDraft: (
		{ api, addButton, nameInput, verifyToastTexts, assertDraftOnly },
		use,
	) =>
		use(async () => {
			const captured =
				Promise.withResolvers<TRPCMutationInput<"receipts.add">>();
			const unmock = api.mockFirst("receipts.add", ({ input }) => {
				captured.resolve(input);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Keep draft for assertions",
				});
			});
			await addButton.click();
			const input = await captured.promise;
			await verifyToastTexts(
				`Error adding "${await nameInput.inputValue()}": Keep draft for assertions`,
			);
			unmock();
			assertDraftOnly();
			return input;
		}),
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
