import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow } from "~utils/date";

import { test } from "./accept-all-intentions-button.utils";

test("Button is invisible when there is no intentions", async ({
	page,
	api,
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
}) => {
	await api.mockUtils.authPage({ page });
	mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
	});
	await openDebtIntentions();
	await expect(acceptAllIntentionButton).not.toBeAttached();
});

test("Button is invisible when there is just 1 intention", async ({
	page,
	api,
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
}) => {
	await api.mockUtils.authPage({ page });
	mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openDebtIntentions();
	await expect(acceptAllIntentionButton).not.toBeAttached();
});

test("'debtIntentions.accept' pending / error", async ({
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
	awaitCacheKey,
	api,
	verifyToastTexts,
	snapshotQueries,
	page,
}) => {
	await api.mockUtils.authPage({ page });
	const debtsAmount = 6;
	const rejectedDebtsAmount = 2;
	const { debts, debtUser } = mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: debtsAmount }),
	});
	await openDebtIntentions();
	const acceptIntentionLaterPause = api.createPause();
	const rejectedDebtsIds = debts
		.filter((_, index) => index < rejectedDebtsAmount)
		.map((debt) => debt.id);
	api.mockFirst("debtIntentions.accept", async ({ input }) => {
		if (!rejectedDebtsIds.includes(input.id)) {
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
				succeed: debtsAmount - rejectedDebtsAmount,
				awaitLoading: false,
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
				errored: rejectedDebtsAmount,
			});
			await verifyToastTexts(
				'Error accepting debts: Mock "debtIntentions.accept" error',
			);
			await expect(page).toHaveURL("/debts/intentions");
		},
		{ name: "error" },
	);

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	api.mockFirst("debts.getAllUser", []);
	api.mockFirst("debts.getAll", []);
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
			await expect(page).toHaveURL("/debts");
			await awaitCacheKey("debtIntentions.accept", {
				succeed: debtsAmount,
				total: true,
			});
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
