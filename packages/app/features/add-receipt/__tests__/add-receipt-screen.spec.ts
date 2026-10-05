import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as currencyInputTest } from "~app/components/app/__tests__/currency-input.utils";
import {
	getItemNameInput,
	getItemPriceInput,
	getItemQuantityInput,
} from "~app/features/receipt-components/__tests__/receipt-item.utils";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateReceiptItems } from "~tests/frontend/generators/receipts";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, currencyInputTest, currenciesPickerTest);

test("On load", async ({
	page,
	addButton,
	snapshotQueries,
	awaitCacheKey,
	mockBase,
	dateInput,
	currencyInput,
	expectCurrency,
}) => {
	const { topCurrencies } = await mockBase();
	const [topCurrency] = topCurrencies.toSorted((a, b) => a.count - b.count);
	assert.ok(topCurrency);

	await snapshotQueries(async () => {
		await page.navigate({ to: "/receipts/add" });
		await awaitCacheKey("currency.top");
	});
	await expect(page).toHaveTitle("RA - Add receipt");
	await expect(addButton).toBeDisabled();
	await expect(dateInput).toHaveValue(
		// We use negative timezone offset in tests hence in our browser
		// its yesterday (compared to mocked date) at the moment
		Temporal.Now.plainDateISO()
			.subtract({ days: 1 })
			.toLocaleString(localSettings.locale, { dateStyle: "medium" }),
	);
	await expectCurrency(currencyInput, topCurrency.currencyCode);
});

test.describe("'Add' button disabled", () => {
	test("On invalid name input", async ({
		mockBase,
		addButton,
		nameInput,
		page,
		faker,
	}) => {
		await mockBase();

		await page.navigate({ to: "/receipts/add" });
		await nameInput.fill(faker.string.alpha(1));
		await expect(addButton).toBeDisabled();
		await nameInput.fill(faker.string.alpha(2));
		await expect(addButton).toBeEnabled();
	});

	test("Invalid item fields do not disable a valid receipt", async ({
		mockBase,
		page,
		faker,
		nameInput,
		addButton,
		addItemButton,
		itemName,
		itemPrice,
		saveItemButton,
	}) => {
		await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await nameInput.fill(faker.lorem.words());
		await addItemButton.click();
		await itemName.fill(faker.commerce.productName());
		await itemPrice.fill("0");
		await itemPrice.press("Tab");
		await expect(saveItemButton).toBeDisabled();
		await expect(addButton).toBeEnabled();
	});
});

test("'receipts.add' mutation", async ({
	page,
	api,
	mockBase,
	addButton,
	nameInput,
	dateInput,
	currencyInput,
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	awaitCacheKey,
	faker,
	fillCurrency,
}) => {
	const { peer: selfPeer } = await mockBase();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receipts.add" error`,
		});
	});

	const receiptName = faker.lorem.words();
	const receiptId = faker.string.uuid();
	const receiptDate = Temporal.Now.plainDateISO().add({ months: 1 });
	const receiptCurrencyCode = generateCurrencyCode(faker);

	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(receiptName);
	await dateInput.fill(receiptDate.toString());
	await fillCurrency(currencyInput, receiptCurrencyCode);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("receipts.add", { error: 1 });
			await verifyToastTexts(`Mock "receipts.add" error`);
		},
		{ name: "error" },
	);
	await page.expectUrl({ to: "/receipts/add" });

	const createPause = api.createPause();
	api.mockFirst("receipts.add", async () => {
		await createPause.promise;
		return {
			id: receiptId,
			createdAt: Temporal.Now.zonedDateTimeISO(),
			participants: [],
			items: [],
			payers: [],
		};
	});
	const buttonWithLoader = withLoader(addButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await addButton.click();
			await verifyToastTexts(`Adding receipt "${receiptName}"..`);
		},
		{ name: "loading" },
	);
	await expect(addButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	const inputs = await page.locator("input").all();
	for (const input of inputs) {
		await expect(input).toBeDisabled();
	}

	api.mockFirst("receipts.get", () => ({
		id: receiptId,
		debts: { direction: "outcoming", debts: [] },
		name: receiptName,
		currencyCode: receiptCurrencyCode,
		issued: receiptDate,
		createdAt: Temporal.Now.zonedDateTimeISO(),
		participants: [],
		items: [],
		payers: [],
		ownerPeerId: selfPeer.id,
		selfPeerId: selfPeer.id,
	}));
	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("receipts.add");
			await verifyToastTexts(`Receipt "${receiptName}" added`);
		},
		{ name: "success", blacklistKeys: "peers.get" },
	);
	await page.expectUrl({ to: "/receipts/$id", params: { id: receiptId } });
});

test("Failed populated submission retains the editable draft", async ({
	api,
	mockBase,
	page,
	faker,
	nameInput,
	addButton,
	addItemButton,
	fillForm,
	saveItemButton,
	itemCards,
	warningSection,
	verifyToastTexts,
	awaitCacheKey,
}) => {
	await mockBase();
	const receiptName = faker.lorem.words();
	const itemName = faker.commerce.productName();
	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(receiptName);
	await addItemButton.click();
	await fillForm({
		name: itemName,
		price: faker.number.int({ min: 5, max: 30 }),
	});
	await saveItemButton.click();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({ code: "FORBIDDEN", message: "Please retry draft" });
	});
	await addButton.click();
	await awaitCacheKey("receipts.add", { error: 1 });
	await verifyToastTexts(`Error adding "${receiptName}": Please retry draft`);
	await page.expectUrl({ to: "/receipts/add" });
	await expect(nameInput).toHaveValue(receiptName);
	await expect(itemCards).toHaveCount(1);
	await expect(warningSection).toContainText(itemName);
	await expect(addButton).toBeEnabled();
});

test.describe("Draft form", () => {
	test("Saving an unassigned item shows the warning and resets the builder", async ({
		mockBase,
		page,
		faker,
		addItemButton,
		fillForm,
		saveItemButton,
		itemCards,
		itemName,
		itemPrice,
		itemQuantity,
		addItemForm,
		warningSection,
	}) => {
		await mockBase();
		const name = faker.commerce.productName();
		await page.navigate({ to: "/receipts/add" });
		await addItemButton.click();
		await fillForm({ name, price: faker.number.int({ min: 2, max: 50 }) });
		await saveItemButton.click();
		await expect(itemCards).toHaveCount(1);
		await expect(warningSection).toContainText(name);
		await expect(itemName).toHaveValue("");
		await expect(itemPrice).toHaveValue("0");
		await expect(itemQuantity).toHaveValue("1");
		await expect(addItemForm).toBeVisible();
	});

	test("Removing an unconsumed item updates the warning immediately", async ({
		mockBase,
		page,
		faker,
		addItemButton,
		fillForm,
		saveItemButton,
		itemCards,
		warningSection,
		icon,
		modal,
	}) => {
		await mockBase();
		const firstName = faker.commerce.productName();
		const secondName = faker.commerce.productName();
		await page.navigate({ to: "/receipts/add" });
		await addItemButton.click();
		await fillForm({
			name: firstName,
			price: faker.number.int({ min: 5, max: 30 }),
		});
		await saveItemButton.click();
		await fillForm({
			name: secondName,
			price: faker.number.int({ min: 5, max: 30 }),
		});
		await saveItemButton.click();
		await itemCards
			.first()
			.getByRole("button")
			.filter({ has: icon("ellipsis") })
			.click();
		await page.getByText("Remove item").click();
		await expect(itemCards).toHaveCount(1);
		await expect(warningSection).toContainText(secondName);
		await expect(warningSection).not.toContainText(firstName);
		await expect(modal("Remove modal")).toBeHidden();
	});
});

test("Complete draft submits only surviving edited data and navigates to the created receipt", async ({
	api,
	mockBase,
	faker,
	page,
	nameInput,
	dateInput,
	currencyInput,
	fillCurrency,
	addItemButton,
	fillForm,
	saveItemButton,
	snapshotQueries,
	itemCards,
	participantsPicker,
	participantsPreview,
	participantRow,
	participantSuggestion,
	selectParticipant,
	addButton,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { peer: self, peers } = await mockBase();
	const receiptId = faker.string.uuid();
	const nextName = faker.commerce.productName();
	const originalPrice = faker.number.int({ min: 10, max: 30 });
	const nextPrice = originalPrice + 3;
	const firstQuantity = faker.number.int({ min: 2, max: 5 });
	const nextQuantity = firstQuantity + 1;
	const items = defaultGenerateReceiptItems({ faker });
	const pause = api.createPause();
	api.mockFirst("receipts.add", async ({ input }) => {
		await pause.promise;
		const createdAt = Temporal.Now.zonedDateTimeISO();
		return {
			id: receiptId,
			createdAt: Temporal.Now.zonedDateTimeISO(),
			items: (input.items ?? []).map((item) => ({
				id: faker.string.uuid(),
				createdAt,
				consumers: (item.consumers ?? []).map(({ peerId }) => ({
					peerId,
					createdAt,
				})),
				payers: (item.payers ?? []).map(({ peerId }) => ({
					peerId,
					createdAt,
				})),
			})),
			participants: (input.participants ?? []).map(() => ({ createdAt })),
			payers: (input.payers ?? []).map(({ peerId }) => ({ peerId, createdAt })),
		};
	});
	api.mockFirst("receipts.get", () => ({
		id: receiptId,
		debts: { direction: "outcoming", debts: [] },
		name: "-",
		currencyCode: "USD",
		issued: Temporal.Now.plainDateISO(),
		createdAt: Temporal.Now.zonedDateTimeISO(),
		participants: [],
		items: [],
		payers: [],
		ownerPeerId: self.id,
		selfPeerId: self.id,
	}));

	const receiptName = faker.lorem.words();
	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(receiptName);
	await dateInput.fill(
		Temporal.Now.plainDateISO().add({ months: 1 }).toString(),
	);
	await fillCurrency(currencyInput, generateCurrencyCode(faker));
	await addItemButton.click();
	for (const item of items) {
		await fillForm({
			name: item.name,
			price: item.price,
			quantity: item.quantity,
		});
		await saveItemButton.click();
	}
	const first = itemCards.first();
	for (const [field, value] of [
		[getItemNameInput(first), nextName],
		[getItemPriceInput(first), String(nextPrice)],
		[getItemQuantityInput(first), String(nextQuantity)],
	] as const) {
		await field.fill(value);
		await field.press("Tab");
	}

	await page.getByRole("button", { name: "Add participants" }).click();
	await expect(participantSuggestion).toBeVisible();
	for (const peer of peers.slice(0, 2)) {
		await selectParticipant(peer.name);
	}
	await expect(participantsPreview).toBeVisible();
	assert.ok(peers[0]);
	const firstPeerRow = participantRow(peers[0].name);
	await firstPeerRow.getByTestId("user-avatar").click();
	await firstPeerRow.getByRole("button", { name: "Pick role" }).click();
	await page
		.getByRole("option", { includeHidden: true })
		.filter({ visible: true, hasText: "Viewer" })
		.click();
	await firstPeerRow.getByRole("button", { name: "+ payer" }).click();
	const payerPart = firstPeerRow.getByRole("textbox", {
		name: "Item payer part",
	});
	await payerPart.fill("2");
	await payerPart.press("Tab");

	await participantsPicker.getByRole("button", { name: "Close" }).click();
	await expect(participantsPicker).toBeHidden();
	await first.getByRole("button", { name: "Consumed by everyone" }).click();
	await first.getByRole("button", { name: "1 / 2" }).first().click();
	const consumerPart = first.getByRole("textbox", {
		name: "Item consumer part",
	});
	await consumerPart.fill("2");
	await consumerPart.press("Tab");
	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("receipts.add", { pending: 1 });
			await verifyToastTexts(`Adding receipt "${receiptName}"..`);
		},
		{
			name: "populated-loading",
			blacklistKeys: ["peers.get", "peers.suggestTop"],
		},
	);
	await snapshotQueries(
		async () => {
			pause.resolve();
			await verifyToastTexts(`Receipt "${receiptName}" added`);
			await page.expectUrl({ to: "/receipts/$id", params: { id: receiptId } });
		},
		{
			name: "populated",
			blacklistKeys: ["peers.get", "peers.suggestTop"],
		},
	);
});

test.describe("Draft form", () => {
	test("Adding self explicitly shows one editor row", async ({
		mockBase,
		page,
		participantSuggestion,
		participantRow,
		participantRows,
	}) => {
		const { peer: self } = await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await page.getByRole("button", { name: "Add participants" }).click();
		await participantSuggestion.getByRole("combobox").click();
		await page
			.getByRole("option", { includeHidden: true })
			.filter({ visible: true })
			.first()
			.click();
		await participantSuggestion.getByRole("combobox").press("Escape");
		await expect(participantRows).toHaveCount(1);
		await participantRow(self.name).getByTestId("user-avatar").click();
		await expect(
			participantRow(self.name).getByRole("button", { name: "Pick role" }),
		).toContainText("Editor");
	});

	test("Suggested peers are selected once and previewed", async ({
		mockBase,
		page,
		selectParticipant,
		participantRows,
		participantsPicker,
		participantsPreview,
	}) => {
		const { peers } = await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await page.getByRole("button", { name: "Add participants" }).click();
		for (const peer of peers) {
			await selectParticipant(peer.name);
		}
		await expect(participantRows).toHaveCount(peers.length);
		await participantsPicker.getByRole("button", { name: "Close" }).click();
		await expect(participantsPicker).toBeHidden();
		await expect(participantsPreview).toBeVisible();
	});

	test("Removing a zero-balance peer is immediate and permits re-adding", async ({
		mockBase,
		page,
		selectParticipant,
		participantRows,
		participantRow,
		modal,
	}) => {
		const {
			peers: [firstPeer],
		} = await mockBase();
		assert.ok(firstPeer);
		await page.navigate({ to: "/receipts/add" });
		await page.getByRole("button", { name: "Add participants" }).click();
		await selectParticipant(firstPeer.name);
		await participantRow(firstPeer.name).getByTestId("user-avatar").click();
		await participantRow(firstPeer.name).getByTestId("remove-button").click();
		await expect(participantRows).toHaveCount(0);
		await expect(modal("Remove modal")).toBeHidden();
		await selectParticipant(firstPeer.name);
		await expect(participantRows).toHaveCount(1);
	});

	test("A consumed draft item is removed without confirmation", async ({
		mockBase,
		page,
		faker,
		addItemButton,
		fillForm,
		saveItemButton,
		itemCards,
		warningSection,
		selectParticipant,
		participantRow,
		participantsPicker,
		icon,
		modal,
	}) => {
		const {
			peers: [firstPeer, secondPeer],
		} = await mockBase();
		assert.ok(firstPeer);
		assert.ok(secondPeer);
		await page.navigate({ to: "/receipts/add" });
		await addItemButton.click();
		await fillForm({
			name: faker.commerce.productName(),
			price: faker.number.int({ min: 2, max: 30 }),
		});
		await saveItemButton.click();
		await page.getByRole("button", { name: "Add participants" }).click();
		await selectParticipant(firstPeer.name);
		await selectParticipant(secondPeer.name);
		await participantRow(firstPeer.name).getByTestId("user-avatar").click();
		await participantsPicker.getByRole("button", { name: "Close" }).click();
		const card = itemCards.first();
		await card.getByRole("button", { name: "Consumed by everyone" }).click();
		await expect(warningSection).not.toBeAttached();
		await card
			.getByRole("button")
			.filter({ has: icon("ellipsis") })
			.click();
		await page.getByText("Remove item").click();
		await expect(itemCards).toHaveCount(0);
		await expect(modal("Remove modal")).toBeHidden();
	});
});
