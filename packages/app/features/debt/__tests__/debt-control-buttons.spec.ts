import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { add, getNow, subtract } from "~utils/date";

import { generateDebtWithUpdated, test } from "./debt-control-buttons.utils";

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
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			subtract.zonedDateTime(updatedAt, {
				seconds: 1,
			}),
		),
	});
	await openDebtScreen(debt.id);
	await expect(acceptIntentionButton).not.toBeAttached();
});

test("Dialog is rendered properly", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	acceptIntentionDialog,
	acceptIntentionDialogYesButton,
	acceptIntentionDialogNoButton,
}) => {
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			add.zonedDateTime(updatedAt, {
				seconds: 1,
			}),
		),
	});
	await openDebtScreen(debt.id);

	await acceptIntentionButton.click();
	await expect(acceptIntentionDialog).toBeVisible();

	await expect(acceptIntentionDialogNoButton).toBeVisible();
	await expect(acceptIntentionDialogYesButton).toBeVisible();

	await acceptIntentionDialogNoButton.click();
	await expect(acceptIntentionDialog).toBeHidden();
	await expect(acceptIntentionButton).toBeVisible();
});

test("'debtIntentions.accept' mutation", async ({
	api,
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	snapshotQueries,
	awaitCacheKey,
	verifyToastTexts,
	acceptIntentionDialogYesButton,
}) => {
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			add.zonedDateTime(updatedAt, {
				seconds: 1,
			}),
		),
	});
	await openDebtScreen(debt.id);
	await expect(acceptIntentionButton).toBeVisible();

	await acceptIntentionButton.click();
	api.mockFirst("debtIntentions.accept", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "debtIntentions.accept" error`,
		});
	});
	await snapshotQueries(async () => {
		await acceptIntentionDialogYesButton.click();
		await awaitCacheKey("debtIntentions.accept", { errored: 1 });
		await verifyToastTexts(`Mock "debtIntentions.accept" error`);
	});
	await expect(acceptIntentionButton).toBeVisible();

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	await acceptIntentionButton.click();
	await snapshotQueries(
		async () => {
			await acceptIntentionDialogYesButton.click();
			await awaitCacheKey("debtIntentions.accept");
			await verifyToastTexts("Debt accepted successfully");
		},
		{ name: "success" },
	);
});
