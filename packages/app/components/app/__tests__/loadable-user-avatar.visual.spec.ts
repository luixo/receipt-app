import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";

import { test as userAvatarFixture } from "./user-avatar.utils";

const test = mergeTests(receiptTest, userAvatarFixture);

test("Loading skeleton", async ({
	openReceipt,
	api,
	mockReceipt,
	userAvatarSkeleton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
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
	await expectScreenshotWithSchemes("skeleton.png", {
		locator: userAvatarSkeleton.first(),
	});
	usersGetPause.resolve();
});

test("Dimmed fallback avatar", async ({
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	userAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers: () => [],
		generateReceiptItems: () => [],
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("dimmed.png", {
		locator: userAvatar.last(),
	});
});
