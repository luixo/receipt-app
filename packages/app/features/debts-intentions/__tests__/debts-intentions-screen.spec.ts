import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow } from "~utils/date";

import { test } from "./utils";

test.describe("Accept all intentions button", () => {
	test("Button is invisible when there is no intentions", async ({
		page,
		mockDebts,
		acceptAllIntentionButton,
		awaitCacheKey,
	}) => {
		await mockDebts({
			generateDebtIntentions: (opts) =>
				defaultGenerateDebts({ ...opts, amount: 0 }),
		});
		await page.navigate({ to: "/debts/intentions" });
		await awaitCacheKey("debtIntentions.getAll");
		await expect(acceptAllIntentionButton).not.toBeAttached();
	});

	test("Button is invisible when there is just 1 intention", async ({
		page,
		mockDebts,
		acceptAllIntentionButton,
		awaitCacheKey,
	}) => {
		await mockDebts({
			generateDebtIntentions: (opts) =>
				defaultGenerateDebts({ ...opts, amount: 1 }),
		});
		await page.navigate({ to: "/debts/intentions" });
		await awaitCacheKey("debtIntentions.getAll");
		await expect(acceptAllIntentionButton).not.toBeAttached();
	});

	test("'debtIntentions.accept' pending / error", async ({
		mockDebts,
		acceptAllIntentionButton,
		awaitCacheKey,
		api,
		verifyToastTexts,
		snapshotQueries,
		page,
	}) => {
		const debtsAmount = 6;
		const rejectedDebtsAmount = 2;
		const { debtIntenions, debtUser } = await mockDebts({
			generateDebtIntentions: (opts) =>
				defaultGenerateDebts({ ...opts, amount: debtsAmount }),
		});
		await page.navigate({ to: "/debts/intentions" });
		const acceptIntentionLaterPause = api.createPause();
		const rejectedDebtsIds = new Set(
			debtIntenions
				.filter((_, index) => index < rejectedDebtsAmount)
				.map((debt) => debt.id),
		);
		api.mockFirst("debtIntentions.accept", async ({ input }) => {
			if (!rejectedDebtsIds.has(input.id)) {
				return { updatedAt: getNow.zonedDateTime() };
			}
			await acceptIntentionLaterPause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debtIntentions.accept" error`,
			});
		});

		await snapshotQueries(
			async () => {
				await acceptAllIntentionButton.click();
				await awaitCacheKey("debtIntentions.accept", {
					success: debtsAmount - rejectedDebtsAmount,
					pending: rejectedDebtsAmount,
				});
				await verifyToastTexts([
					`Accepting ${debtsAmount} debts..`,
					`${debtsAmount - rejectedDebtsAmount} debts accepted successfully`,
				]);
			},
			{ name: "loading", blacklistKeys: "users.get" },
		);

		await snapshotQueries(
			async () => {
				acceptIntentionLaterPause.resolve();
				await awaitCacheKey("debtIntentions.accept", {
					error: rejectedDebtsAmount,
				});
				await verifyToastTexts(
					'Error accepting 2 debts: Mock "debtIntentions.accept" error',
				);
				await page.expectUrl({ to: "/debts/intentions" });
			},
			{ name: "error" },
		);

		api.mockFirst("debtIntentions.accept", {
			updatedAt: getNow.zonedDateTime(),
		});
		api.mockFirst("debts.getAllUser", { items: [] });
		api.mockFirst("debts.getUsersPaged", {
			count: 1,
			cursor: 0,
			items: [debtUser.id],
		});

		await snapshotQueries(
			async () => {
				await acceptAllIntentionButton.click();
				await verifyToastTexts(
					`${rejectedDebtsAmount} debts accepted successfully`,
				);
				await page.expectUrl({ to: "/debts" });
				await awaitCacheKey("debtIntentions.accept", { success: debtsAmount });
			},
			{
				name: "success",
				blacklistKeys: [
					"debts.getAll",
					"debts.getAllUser",
					"debts.getUsersPaged",
					"accountSettings.get",
				],
			},
		);
	});
});
