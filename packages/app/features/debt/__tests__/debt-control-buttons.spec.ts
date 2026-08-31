import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { add, getNow, subtract } from "~utils/date";

import { test } from "./debt-control-buttons.utils";

test("Hidden when there is no counterparty debt", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
}) => {
	const { debt } = await mockDebt();
	await openDebtScreen(debt.id);
	await expect(acceptIntentionButton).not.toBeAttached();
});

test("Hidden when our version is already up to date", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
}) => {
	const { debt } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generated) => ({
				...generated,
				their: {
					updatedAt: subtract.zonedDateTime(generated.updatedAt, {
						seconds: 1,
					}),
					currencyCode: generated.currencyCode,
					timestamp: generated.timestamp,
					amount: generated.amount + 100,
				},
			})),
	});
	await openDebtScreen(debt.id);
	await expect(acceptIntentionButton).not.toBeAttached();
});

test("'debtIntentions.accept' mutation", async ({
	page,
	api,
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	snapshotQueries,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { debt } = await mockDebt({
		generateDebts: (opts) =>
			defaultGenerateDebts(opts).map((generated) => ({
				...generated,
				their: {
					updatedAt: add.zonedDateTime(generated.updatedAt, { seconds: 1 }),
					currencyCode: generated.currencyCode,
					timestamp: generated.timestamp,
					amount: generated.amount + 100,
				},
			})),
	});
	await openDebtScreen(debt.id);
	await expect(acceptIntentionButton).toBeVisible();

	await acceptIntentionButton.click();
	const dialog = page.getByRole("dialog", { name: /Are you sure/ });
	await expect(dialog).toBeVisible();

	// "No" closes the dialog without triggering any mutation
	await dialog.getByRole("button", { name: "No" }).click();
	await expect(dialog).toBeHidden();
	await expect(acceptIntentionButton).toBeVisible();

	await acceptIntentionButton.click();
	api.mockFirst("debtIntentions.accept", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "debtIntentions.accept" error`,
		});
	});
	await snapshotQueries(async () => {
		await dialog.getByRole("button", { name: "Yes" }).click();
		await awaitCacheKey("debtIntentions.accept", { errored: 1 });
		await verifyToastTexts(`Mock "debtIntentions.accept" error`);
	});
	await expect(acceptIntentionButton).toBeVisible();

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	await acceptIntentionButton.click();
	await snapshotQueries(
		async () => {
			await dialog.getByRole("button", { name: "Yes" }).click();
			await awaitCacheKey("debtIntentions.accept");
			await verifyToastTexts("Debt accepted successfully");
		},
		{ name: "success" },
	);
});
