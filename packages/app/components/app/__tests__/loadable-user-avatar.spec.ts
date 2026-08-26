import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as userAvatarFixture } from "./user-avatar.utils";

const test = mergeTests(receiptTest, userAvatarFixture);

test("Shows a skeleton while the owner is loading", async ({
	api,
	mockReceipt,
	userAvatar,
	userAvatarSkeleton,
	openReceipt,
}) => {
	const { receipt } = await mockReceipt({
		generateUsers: () => [],
		generateReceiptItems: () => [],
	});
	const usersGetPause = api.createPause();
	api.mockFirst("users.get", async ({ input, next }) => {
		if (input.id !== receipt.ownerUserId) {
			return next();
		}
		await usersGetPause.promise;
		return next();
	});
	await openReceipt(receipt.id, { awaitCache: false });
	await expect(userAvatarSkeleton.first()).toBeVisible();
	usersGetPause.resolve();
	await expect(userAvatar.first()).toBeVisible();
	await expect(userAvatarSkeleton).toHaveCount(0);
});

test("Shows an error when the owner fails to load", async ({
	api,
	mockReceipt,
	errorMessage,
	consoleManager,
	openReceipt,
}) => {
	const { receipt } = await mockReceipt({
		generateUsers: () => [],
		generateReceiptItems: () => [],
	});
	api.mockFirst("users.get", ({ input }) => {
		if (input.id !== receipt.ownerUserId) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Unexpected user" });
		}
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "users.get" error`,
		});
	});
	consoleManager.ignore(/Mock "users.get" error/);
	await openReceipt(receipt.id, { awaitCache: false });
	await expect(errorMessage(`Mock "users.get" error`).first()).toBeVisible();
});

test("Dims the fallback avatar when there are no payers", async ({
	mockReceipt,
	openReceipt,
	userAvatar,
}) => {
	const { receipt } = await mockReceipt({
		generateUsers: () => [],
		generateReceiptItems: () => [],
	});
	await openReceipt(receipt.id);
	await expect(userAvatar.last()).toHaveClass(/grayscale/);
});
