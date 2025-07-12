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
	const debtsAmount = 4;
	const acceptedDebtsAmount = 2;
	const { debts, debtUser } = mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: debtsAmount }),
	});
	await openDebtIntentions();
	const acceptIntentionLaterPause = api.createPause();
	const acceptedDebtsIds = debts
		.filter((_, index) => index < acceptedDebtsAmount)
		.map((debt) => debt.id);
	api.mockFirst("debtIntentions.accept", async ({ input }) => {
		if (!acceptedDebtsIds.includes(input.id)) {
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
				succeed: debtsAmount - acceptedDebtsAmount,
				awaitLoading: false,
			});
			await verifyToastTexts([
				...new Array(acceptedDebtsAmount)
					.fill(null)
					.map(() => "Accepting debt.."),
				...new Array(debtsAmount - acceptedDebtsAmount)
					.fill(null)
					.map(() => "Debt accepted successfully"),
			]);
		},
		{ name: "loading", blacklistKeys: "users.get" },
	);

	await snapshotQueries(
		async () => {
			acceptIntentionLaterPause.resolve();
			await awaitCacheKey("debtIntentions.accept", {
				errored: acceptedDebtsAmount,
			});
			await verifyToastTexts(
				new Array(acceptedDebtsAmount)
					.fill(null)
					.map(
						() => 'Error accepting debt: Mock "debtIntentions.accept" error',
					),
			);
			await expect(page).toHaveURL("/debts/intentions");
		},
		{ name: "error" },
	);

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	api.mockFirst("debts.getAll", []);
	api.mockFirst("debts.getUsersPaged", {
		count: 1,
		cursor: 0,
		items: [debtUser.id],
	});

	await snapshotQueries(
		async () => {
			await acceptAllIntentionButton.click();
			await awaitCacheKey("debtIntentions.accept", {
				succeed: debtsAmount,
				total: true,
			});
			await verifyToastTexts(
				new Array(acceptedDebtsAmount)
					.fill(null)
					.map(() => "Debt accepted successfully"),
			);
			await expect(page).toHaveURL("/debts");
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
