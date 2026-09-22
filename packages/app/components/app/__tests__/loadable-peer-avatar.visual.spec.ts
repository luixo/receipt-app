import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";

import { test as peerAvatarFixture } from "./peer-avatar.utils";

const test = mergeTests(receiptTest, peerAvatarFixture);

test("Loading skeleton", async ({
	openReceipt,
	api,
	mockReceipt,
	peerAvatarSkeleton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generatePeers: () => [],
		generateReceiptItems: () => [],
	});
	const peersGetPause = api.createPause();
	api.mockFirst("peers.get", async ({ input, next }) => {
		if (input.id !== receipt.ownerPeerId) {
			return next();
		}
		await peersGetPause.promise;
		return next();
	});
	await openReceipt(receipt, { awaitCache: false });
	await expectScreenshotWithSchemes("skeleton.png", {
		locator: peerAvatarSkeleton.first(),
	});
	peersGetPause.resolve();
});

test("Dimmed fallback avatar", async ({
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	peerAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generatePeers: () => [],
		generateReceiptItems: () => [],
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("dimmed.png", {
		locator: peerAvatar.last(),
	});
});
