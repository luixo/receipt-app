import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as loadablePeerFixture } from "./peer.utils";

const test = mergeTests(debtsTest, loadablePeerFixture);

test("Shows a skeleton while the peer is loading", async ({
	openPeerDebtsScreen,
	api,
	mockDebts,
	peer,
	peerSkeleton,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts();
	assert.ok(firstPeer);
	const peersGetPause = api.createPause();
	api.mockFirst("peers.get", async ({ next }) => {
		await peersGetPause.promise;
		return next();
	});
	await openPeerDebtsScreen(firstPeer.id, { awaitCache: false });
	await expect(peerSkeleton).toBeVisible();
	peersGetPause.resolve();
	await expect(peer).toBeVisible();
	await expect(peerSkeleton).toHaveCount(0);
});

test("Shows an error when the peer fails to load", async ({
	openPeerDebtsScreen,
	api,
	mockDebts,
	errorMessage,
	consoleManager,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts();
	assert.ok(firstPeer);
	const mockErrorMessage = `Mock "peers.get" error`;
	api.mockFirst("peers.get", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);
	await openPeerDebtsScreen(firstPeer.id, { awaitCache: false });
	await expect(errorMessage(mockErrorMessage).first()).toBeVisible();
});

test("Renders the loaded peer", async ({
	mockDebts,
	openPeerDebtsScreen,
	peer,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts();
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id);
	await expect(peer.filter({ hasText: firstPeer.name })).toBeVisible();
});
