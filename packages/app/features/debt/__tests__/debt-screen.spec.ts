import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as dateInputTest } from "~app/components/__tests__/date-input.utils";
import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as debtSyncStatusTest } from "~app/components/app/__tests__/debt-sync-status.utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow, subtract } from "~utils/date";

import { test as debtControlButtonsTest } from "./debt-control-buttons.utils";
import { test as localTest } from "./debt-screen.utils";

const test = mergeTests(
	localTest,
	currenciesPickerTest,
	debtControlButtonsTest,
	dateInputTest,
	debtSyncStatusTest,
);

test("On load", async ({
	page,
	mockDebt,
	openDebtScreen,
	amountInput,
	saveAmountButton,
	dateInput,
	noteInput,
	saveNoteButton,
	userPreview,
	removeDebtButton,
	expectDate,
	debtSyncStatus,
}) => {
	const { debt, debtUser } = await mockDebt();
	await openDebtScreen(debt.id);

	await expect(page).toHaveTitle("RA - Debt");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		`${formatCurrency(localSettings.locale, debt.currencyCode, debt.amount)} debt`,
	);
	await expect(userPreview.filter({ hasText: debtUser.name })).toBeVisible();
	expect(Number(await amountInput.inputValue())).toBe(Math.abs(debt.amount));
	await expectDate(dateInput, debt.timestamp);
	await expect(noteInput).toHaveValue(debt.note);
	await expect(saveAmountButton).not.toBeAttached();
	await expect(saveNoteButton).not.toBeAttached();
	await expect(removeDebtButton).toBeVisible();
	await expect(debtSyncStatus).not.toBeAttached();
});

test("Header shows sync status and receipt link when applicable", async ({
	api,
	faker,
	mockDebt,
	openDebtScreen,
	debtSyncStatus,
	receiptLinkButton,
}) => {
	const receiptId = faker.string.uuid();
	const { debt, debtUser } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generated) => ({
				...generated,
				receiptId,
			})),
	});
	api.mockFirst("users.get", ({ input, next }) => {
		if (input.id !== debtUser.id) {
			return next();
		}
		return {
			...debtUser,
			connectedAccount: {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				avatarUrl: undefined,
			},
		};
	});

	await openDebtScreen(debt.id);

	await expect(debtSyncStatus).toBeVisible();
	await expect(receiptLinkButton(receiptId)).toBeVisible();
});

test.describe("Amount", () => {
	test("invalid amount disables the save button", async ({
		mockDebt,
		openDebtScreen,
		amountInput,
		saveAmountButton,
	}) => {
		const { debt } = await mockDebt({
			generateDebts: (opts) =>
				defaultGenerateDebts(opts).map((generated) => ({
					...generated,
					amount: 10,
				})),
		});
		await openDebtScreen(debt.id);

		await amountInput.fill("0");
		await amountInput.press("Tab");
		await expect(saveAmountButton).toBeVisible();
		await expect(saveAmountButton).toBeDisabled();
	});

	test("'debts.update' mutation", async ({
		api,
		mockDebt,
		openDebtScreen,
		amountInput,
		saveAmountButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { debt } = await mockDebt({
			generateDebts: (opts) =>
				defaultGenerateDebts(opts).map((generated) => ({
					...generated,
					amount: 10,
				})),
		});
		await openDebtScreen(debt.id);
		await expect(saveAmountButton).not.toBeAttached();

		await amountInput.fill("25");
		await amountInput.press("Tab");
		await expect(saveAmountButton).toBeEnabled();

		api.mockFirst("debts.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await saveAmountButton.click();
			await awaitCacheKey("debts.update", { errored: 1 });
			await verifyToastTexts(`Mock "debts.update" error`);
		});
		await expect(saveAmountButton).toBeEnabled();

		const pause = api.createPause();
		api.mockFirst("debts.update", async () => {
			await pause.promise;
			return { updatedAt: getNow.zonedDateTime(), reverseUpdated: false };
		});
		await snapshotQueries(
			async () => {
				await saveAmountButton.click();
				await verifyToastTexts("Updating debt..");
			},
			{ name: "loading" },
		);
		await expect(saveAmountButton).not.toBeAttached();
		await expect(amountInput).toBeDisabled();

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("debts.update");
				await verifyToastTexts("Debt updated successfully");
			},
			{ name: "success", skipQueries: true },
		);
		await expect(amountInput).toBeEnabled();
		expect(Number(await amountInput.inputValue())).toBe(25);
	});
});

test.describe("Note", () => {
	test("empty note disables the save button", async ({
		mockDebt,
		openDebtScreen,
		noteInput,
		saveNoteButton,
	}) => {
		const { debt } = await mockDebt();
		await openDebtScreen(debt.id);

		await noteInput.fill("");
		await expect(saveNoteButton).toBeVisible();
		await expect(saveNoteButton).toBeDisabled();
	});

	test("'debts.update' mutation", async ({
		api,
		mockDebt,
		openDebtScreen,
		noteInput,
		saveNoteButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { debt } = await mockDebt();
		await openDebtScreen(debt.id);
		await expect(saveNoteButton).not.toBeAttached();

		await noteInput.fill("Updated note");
		await expect(saveNoteButton).toBeEnabled();

		api.mockFirst("debts.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await saveNoteButton.click();
			await awaitCacheKey("debts.update", { errored: 1 });
			await verifyToastTexts(`Mock "debts.update" error`);
		});
		await expect(saveNoteButton).toBeEnabled();

		api.mockFirst("debts.update", {
			updatedAt: getNow.zonedDateTime(),
			reverseUpdated: false,
		});
		await snapshotQueries(
			async () => {
				await saveNoteButton.click();
				await awaitCacheKey("debts.update");
				await verifyToastTexts("Debt updated successfully");
			},
			{ name: "success" },
		);
		await expect(saveNoteButton).not.toBeAttached();
		await expect(noteInput).toHaveValue("Updated note");
	});
});

test.describe("Date", () => {
	test("'debts.update' mutation", async ({
		api,
		mockDebt,
		openDebtScreen,
		dateInput,
		fillDate,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { debt } = await mockDebt();
		await openDebtScreen(debt.id);
		const nextDate = subtract.plainDate(debt.timestamp, { days: 3 });

		api.mockFirst("debts.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await fillDate(dateInput, nextDate);
			await awaitCacheKey("debts.update", { errored: 1 });
			await verifyToastTexts(`Mock "debts.update" error`);
		});

		api.mockFirst("debts.update", {
			updatedAt: getNow.zonedDateTime(),
			reverseUpdated: false,
		});
		await snapshotQueries(
			async () => {
				await fillDate(dateInput, nextDate);
				await awaitCacheKey("debts.update");
				await verifyToastTexts("Debt updated successfully");
			},
			{ name: "success" },
		);
	});
});

test.describe("Currency", () => {
	test("'debts.update' mutation", async ({
		api,
		mockDebt,
		openDebtScreen,
		currencyTriggerButton,
		currencyButton,
		currenciesPicker,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { debt } = await mockDebt({
			generateDebts: (opts) =>
				defaultGenerateDebts(opts).map((generated) => ({
					...generated,
					currencyCode: "USD",
				})),
		});
		api.mockFirst("currency.top", []);
		await openDebtScreen(debt.id);

		await currencyTriggerButton("USD").click();
		await expect(currenciesPicker).toBeVisible();

		await snapshotQueries(async () => {
			await currencyButton("EUR").click();
			await awaitCacheKey("debts.update");
			await verifyToastTexts("Debt updated successfully");
		});
		await expect(currenciesPicker).toBeHidden();
		await expect(currencyTriggerButton("EUR")).toBeVisible();
	});
});

test.describe("Remove", () => {
	test("removes without confirmation when the debt amount is zero", async ({
		api,
		page,
		mockDebt,
		openDebtScreen,
		removeDebtButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { debt, debtUser } = await mockDebt({
			generateDebts: (opts) =>
				defaultGenerateDebts(opts).map((generated) => ({
					...generated,
					amount: 0,
				})),
		});
		await openDebtScreen(debt.id);
		api.mockFirst("debts.remove", { reverseRemoved: false });
		// Removal navigates to the user's debts page, which fetches these
		api.mockFirst("debts.getAllUser", []);
		api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });

		await snapshotQueries(
			async () => {
				await removeDebtButton.click();
				await awaitCacheKey("debts.remove");
				await verifyToastTexts("Debt removed");
			},
			{ blacklistKeys: ["debts.getAllUser", "debts.getByUserPaged"] },
		);
		await expect(page).toHaveURL(`/debts/user/${debtUser.id}`);
	});

	test("asks for confirmation, then handles error and success", async ({
		api,
		page,
		mockDebt,
		openDebtScreen,
		removeDebtButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
		removeDebtDialog,
	}) => {
		const { debt, debtUser } = await mockDebt({
			generateDebts: (opts) =>
				defaultGenerateDebts(opts).map((generated) => ({
					...generated,
					amount: 10,
				})),
		});
		await openDebtScreen(debt.id);

		await removeDebtButton.click();
		await expect(removeDebtDialog).toBeVisible();

		const removeDebtDialogYesButton = removeDebtDialog.getByRole("button", {
			name: "Yes",
		});
		const removeDebtDialogNoButton = removeDebtDialog.getByRole("button", {
			name: "No",
		});

		await removeDebtDialogNoButton.click();
		await expect(removeDebtDialog).toBeHidden();

		await removeDebtButton.click();
		api.mockFirst("debts.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.remove" error`,
			});
		});
		await snapshotQueries(async () => {
			await removeDebtDialogYesButton.click();
			await awaitCacheKey("debts.remove", { errored: 1 });
			await verifyToastTexts(`Mock "debts.remove" error`);
		});
		await expect(page).toHaveURL(`/debts/${debt.id}`);

		const pause = api.createPause();
		api.mockFirst("debts.remove", async () => {
			await pause.promise;
			return { reverseRemoved: false };
		});
		// Removal navigates to the user's debts page, which fetches these
		api.mockFirst("debts.getAllUser", []);
		api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });
		await removeDebtButton.click();
		await removeDebtDialogYesButton.click();
		await expect(removeDebtButton).toBeDisabled();
		await expect(withLoader(removeDebtButton)).toBeVisible();

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("debts.remove");
				await verifyToastTexts("Debt removed");
			},
			{
				name: "success",
				skipQueries: true,
				blacklistKeys: ["debts.getAllUser", "debts.getByUserPaged"],
			},
		);
		await expect(page).toHaveURL(`/debts/user/${debtUser.id}`);
	});
});
