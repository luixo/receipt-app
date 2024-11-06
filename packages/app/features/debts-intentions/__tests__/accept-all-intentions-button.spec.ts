import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./accept-all-intentions-button.utils";

test("Button is invisible when there is no intentions", async ({
	mockBase,
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
}) => {
	const { user } = mockBase();
	mockDebts({
		targetUserId: user.id,
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
	});
	await openDebtIntentions();
	await expect(acceptAllIntentionButton).not.toBeAttached();
});

test("Button is invisible when there is just 1 intention", async ({
	mockBase,
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
}) => {
	const { user } = mockBase();
	mockDebts({
		targetUserId: user.id,
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openDebtIntentions();
	await expect(acceptAllIntentionButton).not.toBeAttached();
});

test("'debtIntentions.accept' pending / error", async ({
	mockBase,
	mockDebts,
	openDebtIntentions,
	acceptAllIntentionButton,
	awaitCacheKey,
	api,
	verifyToastTexts,
	snapshotQueries,
	page,
}) => {
	const { user } = mockBase();
	const debtsAmount = 6;
	const acceptedDebtsAmount = 2;
	const { debts } = mockDebts({
		targetUserId: user.id,
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: debtsAmount }),
	});
	await openDebtIntentions();
	const acceptIntentionLaterPause = api.createPause();
	const acceptedDebtsIds = debts
		.filter((_, index) => index < acceptedDebtsAmount)
		.map((debt) => debt.id);
	api.mock("debtIntentions.accept", async ({ input }) => {
		if (!acceptedDebtsIds.includes(input.id)) {
			return { updatedAt: new Date() };
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

	api.mock("debtIntentions.accept", { updatedAt: new Date() });

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
		},
		{
			name: "success",
			blacklistKeys: ["debts.getByUsers", "accountSettings.get"],
		},
	);

	await expect(page).toHaveURL("/debts");
});
