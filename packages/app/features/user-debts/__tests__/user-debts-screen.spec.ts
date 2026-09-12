import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupTest } from "~app/components/app/__tests__/debts-group.utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupTest);

test("on load shows header, group, and debt previews", async ({
	page,
	mockDebts,
	debtPreview,
	debtAmount,
}) => {
	const { debtUser: user, debts } = await mockDebts();
	await page.navigate({ to: "/debts/user/$id", params: { id: user.id } });
	await expect(
		page.getByRole("button", { name: "Transfer debts" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Add debt" })).toBeVisible();
	await expect(debtPreview).toHaveCount(debts.length);
	await expect(debtAmount.first()).toHaveText(
		formatCurrency(
			localSettings.locale,
			debts[0]?.currencyCode ?? "USD",
			Math.abs(debts[0]?.amount ?? 0),
		),
	);
});

test("header links preserve the user", async ({ page, api, mockDebts }) => {
	const { debtUser } = await mockDebts();
	api.mockFirst("users.suggestTop", { items: [] });
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await page.getByRole("button", { name: "Transfer debts" }).click();
	await page.expectUrl({
		to: "/debts/transfer",
		search: { from: debtUser.id },
	});
	await page.goBack();
	await page.getByRole("button", { name: "Add debt" }).click();
	await page.expectUrl({ to: "/debts/add", search: { userId: debtUser.id } });
});

test("connected users show debt sync status", async ({
	page,
	api,
	faker,
	mockDebts,
}) => {
	const { debtUser, debts } = await mockDebts();
	assert.ok(debts[0]);
	api.mockFirst("users.get", ({ input, next }) => {
		if (input.id !== debtUser.id) {
			return next();
		}
		return {
			...debtUser,
			connectedAccount: {
				id: faker.string.uuid(),
				email: faker.internet.email(),
			},
		};
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expect(page.getByTestId("debt-sync-status").first()).toBeVisible();
});

test("edit button opens the user modal", async ({ page, mockDebts }) => {
	const { debtUser } = await mockDebts();
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await page
		.getByRole("button")
		.filter({ has: page.locator("svg") })
		.first()
		.click();
	await expect(
		page.getByText("Edit user", { exact: true }).last(),
	).toBeVisible();
});

test("empty list shows the filtered empty state", async ({
	page,
	mockBase,
	api,
}) => {
	const { debtUser } = await mockBase();
	api.mockFirst("debts.getAllUser", { items: [] });
	api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expect(page.getByText("No debts under given filters")).toBeVisible();
});

test("show resolved button enables resolved debts", async ({
	page,
	mockDebts,
	showResolvedButton,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 0 ? 0 : debt.amount,
			})),
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expect(showResolvedButton).toBeVisible();
	await showResolvedButton.click();
	await expect(showResolvedButton).not.toBeAttached();
});

test("selection and removal handle errors and success", async ({
	page,
	api,
	mockDebts,
	debtPreview,
	removeDebtsButton,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { debtUser, debts } = await mockDebts();
	assert.ok(debts[0]);
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await page.getByRole("checkbox").nth(1).check();
	await expect(removeDebtsButton).toBeEnabled();
	api.mockFirst("debts.remove", () => {
		throw new TRPCError({ code: "FORBIDDEN", message: "remove error" });
	});
	await removeDebtsButton.click();
	await awaitCacheKey("debts.remove", { error: 1 });
	await verifyToastTexts("remove error");
	api.mockFirst("debts.remove", { reverseRemoved: false });
	await removeDebtsButton.click();
	await awaitCacheKey("debts.remove");
	await verifyToastTexts("Debt removed");
	await expect(debtPreview).toHaveCount(debts.length);
});

test("pagination loads the next page", async ({
	page,
	api,
	faker,
	mockBase,
	debtPagination,
	awaitCacheKey,
}) => {
	const { debtUser } = await mockBase();
	const generatedDebts = defaultGenerateDebts({
		faker,
		amount: 25,
		userId: debtUser.id,
	});
	const ids = generatedDebts.map(({ id }) => id);
	api.mockFirst("debts.getAllUser", { items: [] });
	api.mockFirst("debts.getByUserPaged", ({ input: { cursor, limit } }) => ({
		items: ids.slice(cursor, cursor + limit),
		count: ids.length,
		cursor,
	}));
	api.mockFirst("debts.get", ({ input: { id } }) => {
		const debt = generatedDebts.find((item) => item.id === id);
		assert.ok(debt);
		return debt;
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await awaitCacheKey("debts.getByUserPaged");
	await expect(debtPagination).toBeVisible();
	await debtPagination
		.getByRole("button", { name: "pagination item 2" })
		.click();
	await awaitCacheKey("debts.getByUserPaged", {
		input: {
			cursor: 10,
			limit: 10,
			userId: debtUser.id,
			filters: { showResolved: false },
		},
	});
});
