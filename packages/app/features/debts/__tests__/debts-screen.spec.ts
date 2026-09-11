import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupTest } from "~app/components/app/__tests__/debts-group.utils";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtIntentions,
	defaultGenerateDebts,
} from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test as debtsScreenTest } from "./debts-screen.utils";

const test = mergeTests(debtsGroupTest, debtsScreenTest);

test.describe("On load", () => {
	test("with debts", async ({
		page,
		mockDebts,
		debtsGroup,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockDebts();
		await snapshotQueries(
			async () => {
				await page.navigate({ to: "/debts" });

				await expect(page).toHaveTitle("RA - Debts");
				await expect(page.getByRole("heading", { level: 1 })).toHaveText(
					"Debts",
				);
				await expect(debtsGroup.first()).toBeVisible();
				await awaitCacheKey("debts.getUsersPaged");
			},
			{ blacklistKeys: ["users.get"] },
		);
	});

	test("with no debts", async ({
		page,
		mockDebts,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 0 }),
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
		});
		await snapshotQueries(async () => {
			await page.navigate({ to: "/debts" });
			await awaitCacheKey("debts.getUsersPaged");
		});
		await expect(page.getByRole("heading", { level: 3 })).toHaveText(
			"No debts under given filters",
		);
	});
});

test("Show resolved debts toggle filters debts", async ({
	page,
	mockDebts,
	showResolvedDebtsSwitch,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 0 ? 0 : debt.amount,
			})),
	});
	await page.navigate({ to: "/debts" });

	await expect(showResolvedDebtsSwitch).toBeVisible();
	await expect(showResolvedDebtsSwitch).not.toBeChecked();

	await snapshotQueries(
		async () => {
			await showResolvedDebtsSwitch.click();
			await awaitCacheKey("debts.getAll");
		},
		{ name: "show-resolved" },
	);

	await expect(showResolvedDebtsSwitch).toBeChecked();

	await snapshotQueries(
		async () => {
			await showResolvedDebtsSwitch.click();
			await awaitCacheKey("debts.getAll");
		},
		{ name: "hide-resolved" },
	);
});

test("Pagination is visible when there are many users", async ({
	page,
	mockPagedUsers,
	paginationBlock,
	awaitCacheKey,
}) => {
	await mockPagedUsers();

	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getUsersPaged");

	await expect(paginationBlock).toBeVisible();
});

test("Loading state shows spinner on page change", async ({
	page,
	api,
	mockPagedUsers,
	paginationBlock,
	loader,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockPagedUsers();
	const secondPageInput = {
		limit: 10,
		filters: { showResolved: false },
		cursor: 10,
	};

	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getUsersPaged");
	await expect(paginationBlock).toBeVisible();

	const pause = api.createPause();
	api.mockFirst("debts.getUsersPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});

	await snapshotQueries(
		async () => {
			await paginationBlock
				.getByRole("button", { name: "pagination item 2" })
				.click();
			await awaitCacheKey("debts.getUsersPaged", {
				input: secondPageInput,
				pending: 1,
			});
			await expect(loader).toBeVisible();
			pause.resolve();
			await awaitCacheKey("debts.getUsersPaged", {
				input: secondPageInput,
				success: 1,
			});
			await expect(loader).toBeHidden();
		},
		{ name: "page-2", blacklistKeys: ["users.get"] },
	);
});

test.describe("Header aside", () => {
	test("Add debt button", async ({ api, page, mockDebts }) => {
		await mockDebts();
		await page.navigate({ to: "/debts" });

		api.mockFirst("currency.top", () => ({ items: [] }));
		api.mockFirst("users.suggestTop", () => ({ items: [] }));
		await page.getByRole("button", { name: "Add debt" }).click();
		await page.expectUrl({ to: "/debts/add" });
	});

	test("Transfer button", async ({ api, page, mockDebts }) => {
		await mockDebts();
		await page.navigate({ to: "/debts" });

		api.mockFirst("users.suggestTop", () => ({ items: [] }));
		await page.getByRole("button", { name: "Transfer" }).click();
		await page.expectUrl({ to: "/debts/transfer" });
	});

	test.describe("Debt intentions button", () => {
		test("Navigates", async ({
			page,
			api,
			mockDebts,
			faker,
			awaitCacheKey,
			debtIntentionsButton,
		}) => {
			const {
				users: [firstUser],
			} = await mockDebts();
			assert.ok(firstUser);
			api.mockFirst("debtIntentions.getAll", {
				items: defaultGenerateDebtIntentions({
					faker,
					amount: 6,
					userId: firstUser.id,
				}),
			});
			await page.navigate({ to: "/debts" });

			await awaitCacheKey("debtIntentions.getAll");
			await debtIntentionsButton.click();
			await page.expectUrl({ to: "/debts/intentions" });
		});

		test("Disabled when no intentions", async ({
			page,
			api,
			mockDebts,
			awaitCacheKey,
			debtIntentionsButton,
		}) => {
			await mockDebts();
			api.mockFirst("debtIntentions.getAll", { items: [] });
			await page.navigate({ to: "/debts" });

			await awaitCacheKey("debtIntentions.getAll");
			await expect(debtIntentionsButton).toBeDisabled();
		});
	});
});

// CI fails on clicking preview, verify in CI it works
test.fixme("User debts preview navigates to user debts screen", async ({
	page,
	mockDebts,
	userDebtsPreview,
}) => {
	const {
		users: [firstUser],
	} = await mockDebts();
	assert.ok(firstUser);
	await page.navigate({ to: "/debts" });

	await expect(userDebtsPreview.first()).toBeVisible();
	await userDebtsPreview.first().click();

	await page.expectUrl({
		to: "/debts/user/$id",
		params: { id: firstUser.id },
	});
});

test("'debts.getUsersPaged' error shows error message", async ({
	page,
	api,
	mockBase,
	errorMessage,
	awaitCacheKey,
	consoleManager,
	snapshotQueries,
}) => {
	await mockBase();
	api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });
	const mockErrorMessage = `Mock "getUsersPaged" error`;
	api.mockFirst("debts.getUsersPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);
	api.mockFirst("accountSettings.get", { manualAcceptDebts: false });

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/debts" });
			await awaitCacheKey("debts.getUsersPaged", { error: 1 });
			await expect(errorMessage(mockErrorMessage)).toBeVisible();
		},
		{ name: "error" },
	);
});
