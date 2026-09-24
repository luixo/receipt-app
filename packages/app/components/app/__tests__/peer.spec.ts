import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";
import { test as peersFixture } from "~app/features/peers/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

const test = mergeTests(peersFixture, peerFixture);

test("No connected  user - no description", async ({
	faker,
	mockBase,
	page,
	peer,
}) => {
	const {
		peers: [firstPeer],
	} = await mockBase({
		generatePeers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedUser: undefined,
			},
		],
	});
	assert.ok(firstPeer);
	await page.navigate({ to: "/peers" });
	const peerLocator = peer.filter({ hasText: firstPeer.name });
	await expect(peerLocator).toBeVisible();
	await expect(peerLocator).not.toContainText("@");
});

test("Connected  user - description", async ({
	faker,
	mockBase,
	peer,
	page,
}) => {
	const {
		peers: [firstPeer],
	} = await mockBase({
		generatePeers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedUser: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					avatarUrl: undefined,
				},
			},
		],
	});
	assert.ok(firstPeer);
	assert.ok(firstPeer.connectedUser);
	await page.navigate({ to: "/peers" });
	const peerLocator = peer.filter({ hasText: firstPeer.name });
	await expect(peerLocator).toBeVisible();
	await expect(peerLocator).toContainText(firstPeer.connectedUser.email);
});
