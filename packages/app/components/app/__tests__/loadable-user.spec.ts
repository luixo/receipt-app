import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

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
	const {
		users: [firstUser],
	} = await mockDebts();
	assert.ok(firstUser);
	const usersGetPause = api.createPause();
	api.mockFirst("users.get", async ({ next }) => {
		await usersGetPause.promise;
		return next();
	});
	await openUserDebtsScreen(firstUser.id, { awaitCache: false });
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
	const {
		users: [firstUser],
	} = await mockDebts();
	assert.ok(firstUser);
	const mockErrorMessage = `Mock "users.get" error`;
	api.mockFirst("users.get", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);
	await openUserDebtsScreen(firstUser.id, { awaitCache: false });
	await expect(errorMessage(mockErrorMessage).first()).toBeVisible();
});

test("Renders the loaded user", async ({
	mockDebts,
	openUserDebtsScreen,
	user,
}) => {
	const {
		users: [firstUser],
	} = await mockDebts();
	assert.ok(firstUser);
	await openUserDebtsScreen(firstUser.id);
	await expect(user.filter({ hasText: firstUser.name })).toBeVisible();
});
