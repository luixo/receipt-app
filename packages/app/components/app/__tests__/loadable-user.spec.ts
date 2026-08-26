import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as loadableUserFixture } from "./user.utils";

const test = mergeTests(debtsTest, loadableUserFixture);

test("Shows a skeleton while the user is loading", async ({
	openUserDebtsScreen,
	api,
	mockDebts,
	user,
	userSkeleton,
}) => {
	const { debtUser } = await mockDebts();
	const usersGetPause = api.createPause();
	api.mockFirst("users.get", async ({ next }) => {
		await usersGetPause.promise;
		return next();
	});
	await openUserDebtsScreen(debtUser.id, { awaitCache: false });
	await expect(userSkeleton).toBeVisible();
	usersGetPause.resolve();
	await expect(user).toBeVisible();
	await expect(userSkeleton).toHaveCount(0);
});

test("Shows an error when the user fails to load", async ({
	openUserDebtsScreen,
	api,
	mockDebts,
	errorMessage,
	consoleManager,
}) => {
	const { debtUser } = await mockDebts();
	api.mockFirst("users.get", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "users.get" error`,
		});
	});
	consoleManager.ignore(/Mock "users.get" error/);
	await openUserDebtsScreen(debtUser.id, { awaitCache: false });
	await expect(errorMessage(`Mock "users.get" error`).first()).toBeVisible();
});

test("Renders the loaded user", async ({
	mockDebts,
	openUserDebtsScreen,
	user,
}) => {
	const { debtUser } = await mockDebts();
	await openUserDebtsScreen(debtUser.id);
	await expect(user.filter({ hasText: debtUser.name })).toBeVisible();
});
