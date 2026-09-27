import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as peerFixture } from "./peer.utils";

const test = mergeTests(debtsTest, peerFixture);

test("Peer query error", async ({
	api,
	mockDebts,
	openPeerDebtsScreen,
	errorMessage,
	consoleManager,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "middle");
	const { peers } = await mockDebts();
	const [firstPeer] = peers;
	assert.ok(firstPeer);
	const message = 'Mock "peers.get" visual error';
	api.mockFirst("peers.get", ({ input, next }) => {
		if (input.id !== firstPeer.id) {
			return next();
		}
		throw new TRPCError({ code: "FORBIDDEN", message });
	});
	consoleManager.ignore(message);
	await openPeerDebtsScreen(firstPeer.id, { awaitCache: false });
	const peerError = errorMessage(message).first();
	await expect(peerError).toBeVisible();
	await expectScreenshotWithSchemes("error.png", {
		locator: peerError,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#fbfbfb" : expectedPixels[0].rgb,
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Loaded peer", async ({
	mockDebts,
	openPeerDebtsScreen,
	peer,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "middle");
	const { peers } = await mockDebts();
	const [firstPeer] = peers;
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id);
	await expectScreenshotWithSchemes("loaded.png", {
		locator: peer.filter({ hasText: firstPeer.name }),
	});
});
