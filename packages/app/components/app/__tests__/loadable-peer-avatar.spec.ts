import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as peerAvatarFixture } from "./peer-avatar.utils";

const test = mergeTests(receiptTest, peerAvatarFixture);

test("Shows a skeleton while the owner is loading", async ({
	api,
	mockReceipt,
	peerAvatar,
	peerAvatarSkeleton,
	openReceipt,
}) => {
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
	await expect(peerAvatarSkeleton.first()).toBeVisible();
	peersGetPause.resolve();
	await expect(peerAvatar.first()).toBeVisible();
	await expect(peerAvatarSkeleton).toHaveCount(0);
});

test("Shows an error when the owner fails to load", async ({
	api,
	mockReceipt,
	errorMessage,
	consoleManager,
	openReceipt,
}) => {
	const { receipt } = await mockReceipt({
		generatePeers: () => [],
		generateReceiptItems: () => [],
	});
	const mockErrorMessage = `Mock "peers.get" error`;
	api.mockFirst("peers.get", ({ input }) => {
		if (input.id !== receipt.ownerPeerId) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Unexpected peer" });
		}
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);
	await openReceipt(receipt, { awaitCache: false });
	await expect(errorMessage(mockErrorMessage).first()).toBeVisible();
});

test("Dims the fallback avatar when there are no payers", async ({
	mockReceipt,
	openReceipt,
	peerAvatar,
}) => {
	const { receipt } = await mockReceipt({
		generatePeers: () => [],
		generateReceiptItems: () => [],
	});
	await openReceipt(receipt);
	await expect(peerAvatar.last()).toHaveClass(/grayscale/);
});
