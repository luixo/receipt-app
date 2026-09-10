import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow } from "~utils/date";

import { test } from "./utils";

test("Accept button is visible and clickable", async ({
	api,
	page,
	mockDebts,
	acceptButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await page.navigate({ to: "/debts/intentions" });

	await expect(acceptButton).toBeVisible();

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });

	await snapshotQueries(async () => {
		await acceptButton.click();
		await awaitCacheKey("debtIntentions.accept");
		await verifyToastTexts("Debt accepted successfully");
	});
});

test("'debtIntentions.accept' pending / error", async ({
	page,
	api,
	mockDebts,
	acceptButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	const { debtIntenions } = await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	const [debtIntenion] = debtIntenions;
	assert.ok(debtIntenion);
	await page.navigate({ to: "/debts/intentions" });

	const mockErrorMessage = `Mock "debtIntentions.accept" error`;
	const acceptPause = api.createPause();
	api.mockFirst("debtIntentions.accept", async () => {
		await acceptPause.promise;
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});

	await snapshotQueries(
		async () => {
			await acceptButton.click();
			await awaitCacheKey("debtIntentions.accept", { pending: 1 });
			await verifyToastTexts("Accepting debt..");
		},
		{ name: "loading" },
	);

	await snapshotQueries(
		async () => {
			acceptPause.resolve();
			await awaitCacheKey("debtIntentions.accept", { error: 1 });
			await verifyToastTexts(`Error accepting debt: ${mockErrorMessage}`);
			await page.expectUrl({ to: "/debts/intentions" });
		},
		{ name: "error" },
	);

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	api.mockFirst("debts.getAllUser", { items: [] });
	api.mockFirst("debts.getUsersPaged", {
		count: 1,
		cursor: 0,
		items: [debtIntenion.userId],
	});

	await snapshotQueries(
		async () => {
			await acceptButton.click();
			await page.expectUrl({ to: "/debts/intentions" });
			await awaitCacheKey("debtIntentions.accept");
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

test("Accept and edit button navigates to debt page on success", async ({
	page,
	api,
	mockDebts,
	acceptAndEditButton,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { debtIntenions } = await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	const [debtIntention] = debtIntenions;
	assert.ok(debtIntention);
	await page.navigate({ to: "/debts/intentions" });

	api.mockFirst("debtIntentions.accept", { updatedAt: getNow.zonedDateTime() });
	api.mockFirst("debts.getAllUser", { items: [] });
	api.mockFirst("debts.getUsersPaged", {
		count: 1,
		cursor: 0,
		items: [debtIntention.userId],
	});
	api.mockFirst("debts.get", {
		id: debtIntention.id,
		userId: debtIntention.userId,
		receiptId: debtIntention.receiptId,
		note: debtIntention.note,
		amount: debtIntention.amount,
		currencyCode: debtIntention.currencyCode,
		timestamp: debtIntention.timestamp,
		updatedAt: debtIntention.updatedAt,
	});

	await snapshotQueries(
		async () => {
			await acceptAndEditButton.click();
			await page.expectUrl({
				to: "/debts/$id",
				params: { id: debtIntention.id },
			});
			await awaitCacheKey("debtIntentions.accept");
		},
		{
			name: "accept-and-edit-success",
			blacklistKeys: [
				"debts.getAll",
				"debts.getAllUser",
				"debts.getUsersPaged",
				"debts.get",
				"accountSettings.get",
			],
		},
	);
});

test("Reject button is visible but disabled", async ({
	page,
	mockDebts,
	rejectButton,
}) => {
	await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await page.navigate({ to: "/debts/intentions" });

	await expect(rejectButton).toBeVisible();
	await expect(rejectButton).toBeDisabled();
});
