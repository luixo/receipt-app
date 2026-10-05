import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as currencyInputTest } from "~app/components/app/__tests__/currency-input.utils";
import { expect } from "~tests/frontend/fixtures";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, currencyInputTest, currenciesPickerTest);

test("Form", async ({
	mockBase,
	page,
	nameInput,
	dateInput,
	currencyInput,
	expectScreenshotWithSchemes,
	fillCurrency,
	faker,
}) => {
	await mockBase();
	await page.navigate({ to: "/receipts/add" });
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Add receipt",
	);
	await expectScreenshotWithSchemes("empty.png");
	await nameInput.fill(faker.lorem.words());
	await dateInput.fill(
		Temporal.Now.plainDateISO().add({ months: 1 }).toString(),
	);
	await fillCurrency(currencyInput, generateCurrencyCode(faker));
	await expectScreenshotWithSchemes("filled.png");
});

test("Errors in form", async ({
	mockBase,
	page,
	nameInput,
	nameInputWrapper,
	expectScreenshotWithSchemes,
	skip,
	faker,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(faker.string.alpha(1));
	await expectScreenshotWithSchemes("fill-name-error.png", {
		locator: nameInputWrapper,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#d8e9fd" : "#001125",
			},
			...expectedPixels.slice(1),
		],
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
	faker,
	fillCurrency,
	expectScreenshotWithSchemes,
	clearToasts,
}) => {
	await mockBase();
	api.mockFirst("receipts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "receipts.add" error`,
		});
	});

	await page.navigate({ to: "/receipts/add" });
	await nameInput.fill(faker.lorem.words());
	await dateInput.fill(
		Temporal.Now.plainDateISO().add({ months: 1 }).toString(),
	);
	await fillCurrency(currencyInput, generateCurrencyCode(faker));
	const createPause = api.createPause();
	api.mockFirst("receipts.add", async () => {
		await createPause.promise;
		return {
			id: "anything",
			createdAt: Temporal.Now.zonedDateTimeISO(),
			items: [],
			participants: [],
			payers: [],
		};
	});
	await addButton.click();
	await clearToasts();
	await expectScreenshotWithSchemes("mutation-loading.png");
});

test.describe("Draft form", () => {
	test("Populated draft composition and item creation", async ({
		mockBase,
		page,
		nameInput,
		addItemButton,
		fillForm,
		saveItemButton,
		addItemForm,
		itemCards,
		warningSection,
		expectScreenshotWithSchemes,
		skip,
		faker,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await nameInput.fill(faker.lorem.words());
		await addItemButton.click();
		await fillForm({
			name: faker.commerce.productName(),
			price: faker.number.int({ min: 5, max: 30 }),
			quantity: 2,
		});
		await saveItemButton.click();
		await expect(warningSection).toBeVisible();
		await expect(addItemForm).toBeVisible();
		await expectScreenshotWithSchemes("draft-composition.png", {
			mask: [addItemForm, itemCards],
		});
		await expectScreenshotWithSchemes("draft-item-builder.png", {
			locator: addItemForm,
			mapExpectedPixels: ({ expectedPixels, colorMode }) => [
				{
					rgb: colorMode === "light" ? "#ffffff" : "#18181b",
					location: [8, 60],
				},
				...expectedPixels.slice(1),
			],
		});
	});

	test("Participant picker with draft payer and roles", async ({
		mockBase,
		page,
		selectParticipant,
		participantRow,
		participantRows,
		participantsPicker,
		participantSuggestion,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		const { peers } = await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await page.getByRole("button", { name: "Add participants" }).click();
		for (const peer of peers) {
			await selectParticipant(peer.name);
		}
		await expect(participantRows).toHaveCount(peers.length);
		for (const peer of peers) {
			await participantRow(peer.name).getByTestId("user-avatar").click();
			await participantRow(peer.name)
				.getByRole("button", { name: "+ payer" })
				.click();
		}
		for (const peer of peers) {
			await expect(
				participantRow(peer.name).getByRole("textbox", {
					name: "Item payer part",
				}),
			).toHaveValue("1");
		}
		await expect(participantSuggestion.getByRole("combobox")).toBeVisible();
		await expectScreenshotWithSchemes("draft-participant-picker.png", {
			locator: participantsPicker,
			mapExpectedPixels: ({ expectedPixels, colorMode }) => [
				{
					...expectedPixels[0],
					rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
				},
				...expectedPixels.slice(1),
			],
		});
	});

	test("Draft item with two unequal consumers and payer selector", async ({
		mockBase,
		page,
		addItemButton,
		fillForm,
		saveItemButton,
		faker,
		selectParticipant,
		itemCards,
		participantRows,
		participantsPicker,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		const { peers } = await mockBase();
		await page.navigate({ to: "/receipts/add" });
		await addItemButton.click();
		await fillForm({
			name: faker.commerce.productName(),
			price: faker.number.int({ min: 5, max: 30 }),
			quantity: 2,
		});
		await saveItemButton.click();
		await page.getByRole("button", { name: "Add participants" }).click();
		for (const peer of peers.slice(0, 2)) {
			await selectParticipant(peer.name);
		}
		await expect(participantRows).toHaveCount(2);
		await participantRows.first().getByTestId("user-avatar").click();
		await participantRows
			.first()
			.getByRole("button", { name: "+ payer" })
			.click();
		await participantsPicker.getByRole("button", { name: "Close" }).click();
		await expect(participantsPicker).toBeHidden();
		const card = itemCards.first();
		await card.getByRole("button", { name: "Consumed by everyone" }).click();
		await card.getByRole("button", { name: "1 / 2" }).first().click();
		const part = card.getByRole("textbox", { name: "Item consumer part" });
		await part.fill("2");
		await part.press("Tab");
		await expect(card.getByRole("button", { name: "2 / 3" })).toBeVisible();
		await expectScreenshotWithSchemes("draft-item-shares.png", {
			locator: card,
			mapExpectedPixels: ({ expectedPixels, colorMode }) => [
				{
					...expectedPixels[0],
					rgb: colorMode === "light" ? "#fafafa" : "#000000",
				},
				...expectedPixels.slice(1),
			],
		});
	});
});
