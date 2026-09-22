import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as peerAvatarFixture } from "~app/components/app/__tests__/peer-avatar.utils";
import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";
import { test as peersFixture } from "~app/features/peers/__tests__/utils";

const test = mergeTests(peersFixture, peerFixture, peerAvatarFixture);

test("No connected account", async ({
	faker,
	mockBase,
	page,
	awaitCacheKey,
	peer,
	expectScreenshotWithSchemes,
	peerAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const {
		peers: [firstPeer],
	} = await mockBase({
		generatePeers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: undefined,
			},
		],
	});
	assert.ok(firstPeer);
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await expectScreenshotWithSchemes("no-account.png", {
		locator: peer.filter({ hasText: firstPeer.name }),
		mask: [peerAvatar],
		mapExpectedPixels: ({ expectedPixels }) => [
			{ ...expectedPixels[0], rgb: "#ff00ff" },
			...expectedPixels.slice(1),
		],
	});
});

test("Connected account", async ({
	page,
	awaitCacheKey,
	faker,
	mockBase,
	peer,
	peerAvatar,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const {
		peers: [firstPeer],
	} = await mockBase({
		generatePeers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					avatarUrl: undefined,
				},
			},
		],
	});
	assert.ok(firstPeer);
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await expectScreenshotWithSchemes("connected-account.png", {
		locator: peer.filter({ hasText: firstPeer.name }),
		mask: [peerAvatar],
		mapExpectedPixels: ({ expectedPixels }) => [
			{ ...expectedPixels[0], rgb: "#ff00ff" },
			...expectedPixels.slice(1),
		],
	});
});

test("Loading skeleton", async ({
	api,
	page,
	awaitCacheKey,
	mockBase,
	peerSkeleton,
	expectScreenshotWithSchemes,
	skip,
	faker,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const {
		peers: [firstPeer],
	} = await mockBase({
		generatePeers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: undefined,
			},
		],
	});
	assert.ok(firstPeer);
	const peersGetPause = api.createPause();
	api.mockFirst("peers.get", async ({ next }) => {
		await peersGetPause.promise;
		return next();
	});
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await expectScreenshotWithSchemes("skeleton.png", { locator: peerSkeleton });
	peersGetPause.resolve();
});
