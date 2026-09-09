import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as currenciesPickerTest } from "~app/components/app/__tests__/currencies-picker.utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow } from "~utils/date";

import { test as originalTest } from "./utils";

const test = mergeTests(originalTest, currenciesPickerTest);

test.describe("Header", () => {
	test("Title", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		page,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await expect(page).toHaveTitle("RA - Transfer debts");
	});

	test("Back button goes to debts list when no from user", async ({
		mockBase,
		openDebtsTransferScreen,
		page,
		backLink,
	}) => {
		await mockBase();
		await openDebtsTransferScreen();
		await backLink.click();
		await page.expectUrl({ to: "/debts" });
	});

	test("Back button goes to user debts when from user selected", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		backLink,
		page,
	}) => {
		const { fromUser, debts } = await mockDebtsTransfer();
		api.mockFirst("debts.getByUserPaged", {
			items: debts.map((debt) => debt.id),
			count: 0,
			cursor: 0,
		});
		await openDebtsTransferScreen({ fromUserId: fromUser.id });
		await backLink.click();
		await page.expectUrl({
			to: "/debts/user/$id",
			params: { id: fromUser.id },
		});
	});
});

test.describe("User selection", () => {
	test("Pre-selected users via URL params shows form", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		awaitCacheKey,
		transferForm,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(transferForm).toBeVisible();
	});

	test("Same user selected for from and to disables submit", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		submitButton,
		awaitCacheKey,
	}) => {
		const { fromUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: fromUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(submitButton).toBeDisabled();
	});

	test("Only from user selected shows form", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		awaitCacheKey,
		transferForm,
	}) => {
		const { fromUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({ fromUserId: fromUser.id });
		await awaitCacheKey("debts.getAllUser");
		await expect(transferForm).toBeVisible();
	});

	test("Only to user selected without from shows no form", async ({
		mockBase,
		openDebtsTransferScreen,
		transferForm,
	}) => {
		const { toUser } = await mockBase();
		await openDebtsTransferScreen({ toUserId: toUser.id });
		await expect(transferForm).not.toBeAttached();
	});
});

test.describe("Form validation", () => {
	test("Submit button disabled when no amounts entered", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		submitButton,
		awaitCacheKey,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(submitButton).toBeDisabled();
	});

	test("Submit button enabled when valid amounts entered", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		submitButton,
		awaitCacheKey,
		amountInput,
		transferForm,
	}) => {
		const { fromUser, toUser, debts } = await mockDebtsTransfer();
		assert.ok(debts[0]);
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(transferForm).toBeVisible();
		const firstDebtAmountInput = amountInput(debts[0].currencyCode);
		await firstDebtAmountInput.fill("10");
		await firstDebtAmountInput.press("Tab");
		await expect(submitButton).toBeEnabled();
	});
});

test.describe("Currency management", () => {
	test("Add currency button opens modal", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		addCurrencyButton,
		awaitCacheKey,
		currenciesPicker,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		api.mockFirst("currency.top", { items: [] });
		await addCurrencyButton.click();
		await expect(currenciesPicker).toBeVisible();
	});

	test("All max button fills all fields with max values", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		allMaxButton,
		awaitCacheKey,
		page,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await allMaxButton.click();
		const inputs = await page.getByRole("textbox").all();
		await Promise.all(
			inputs.map((input) => expect(input).not.toHaveValue("0")),
		);
	});
});

test.describe("Show resolved debts option", () => {
	test("Shows option when there are resolved debts", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		awaitCacheKey,
		page,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer({
			generateDebts: (opts) => {
				const [firstDebt, secondDebt, thirdDebt] = defaultGenerateDebts({
					...opts,
					amount: 3,
				});
				assert.ok(firstDebt);
				assert.ok(secondDebt);
				assert.ok(thirdDebt);
				return [
					{ ...firstDebt, amount: 10 },
					{
						...secondDebt,
						currencyCode: firstDebt.currencyCode,
						amount: -10,
					},
					{
						...thirdDebt,
						currencyCode: firstDebt.currencyCode === "USD" ? "EUR" : "USD",
						amount: 10,
					},
				];
			},
		});
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(page.getByTestId("show-resolved-debts-switch")).toBeVisible();
	});

	test("Hides option when no resolved debts", async ({
		mockDebtsTransfer,
		openDebtsTransferScreen,
		awaitCacheKey,
		page,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		await expect(page.getByTestId("show-resolved-debts-switch")).toBeHidden();
	});
});

test.describe("'debts.add' mutation", () => {
	test("error", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		submitButton,
		awaitCacheKey,
		verifyToastTexts,
		amountInput,
		snapshotQueries,
	}) => {
		const { fromUser, toUser, debts } = await mockDebtsTransfer();
		assert.ok(debts[0]);
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		const firstDebtAmountInput = amountInput(debts[0].currencyCode);
		await firstDebtAmountInput.fill("10");
		await firstDebtAmountInput.press("Tab");

		const mockErrorMessage = `Mock "debts.add" error`;
		api.mockFirst("debts.add", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});

		await snapshotQueries(
			async () => {
				await submitButton.click();
				await awaitCacheKey("debts.add", { error: 2 });
				await verifyToastTexts(mockErrorMessage);
			},
			{
				name: "error",
				blacklistKeys: ["users.suggest"],
			},
		);
	});

	test("pending", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		submitButton,
		awaitCacheKey,
		withLoader,
		verifyToastTexts,
		amountInput,
		snapshotQueries,
	}) => {
		const { fromUser, toUser, debts } = await mockDebtsTransfer();
		assert.ok(debts[0]);
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
		});
		await awaitCacheKey("debts.getAllUser");
		const firstDebtAmountInput = amountInput(debts[0].currencyCode);
		await firstDebtAmountInput.fill("10");
		await firstDebtAmountInput.press("Tab");

		const createPause = api.createPause();
		api.mockFirst("debts.add", async () => {
			await createPause.promise;
			return {
				id: "test-id",
				updatedAt: getNow.zonedDateTime(),
				reverseAccepted: false,
			};
		});
		const buttonWithLoader = withLoader(submitButton);
		await expect(buttonWithLoader).toBeHidden();

		await snapshotQueries(
			async () => {
				await submitButton.click();
				await verifyToastTexts("Adding 2 debts..");
				await expect(submitButton).toBeDisabled();
				await expect(buttonWithLoader).toBeVisible();
			},
			{
				name: "pending",
				blacklistKeys: ["debts.getAllUser", "users.suggest"],
			},
		);
		await snapshotQueries(
			async () => {
				createPause.resolve();
				await awaitCacheKey("debts.add", { success: 2 });
				await verifyToastTexts("2 debts added");
			},
			{
				name: "success",
				blacklistKeys: ["users.suggest"],
			},
		);
	});
});

test.describe("Error handling", () => {
	test("Handles debts.getAllUser error gracefully", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		awaitCacheKey,
		consoleManager,
		errorMessage,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		const mockErrorMessage = `Mock "debts.getAllUser" error`;
		api.mockFirst("debts.getAllUser", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		consoleManager.ignore(mockErrorMessage);
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
			awaitCache: false,
		});
		await awaitCacheKey("users.get", { success: 2 });
		await expect(errorMessage(mockErrorMessage)).toBeVisible();
	});

	test("Handles users.get error gracefully", async ({
		api,
		mockDebtsTransfer,
		openDebtsTransferScreen,
		consoleManager,
		errorMessage,
	}) => {
		const { fromUser, toUser } = await mockDebtsTransfer();
		const mockErrorMessage = `Mock "users.get" error`;
		api.mockFirst("users.get", () => {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: mockErrorMessage,
			});
		});
		consoleManager.ignore(mockErrorMessage);
		consoleManager.ignore(
			/Failed to load resource: the server responded with a status of 500/,
		);
		await openDebtsTransferScreen({
			fromUserId: fromUser.id,
			toUserId: toUser.id,
			awaitCache: false,
		});
		await expect(errorMessage(mockErrorMessage)).toBeVisible();
	});
});
