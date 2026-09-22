import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";

import { test as peerAvatarFixture } from "./peer-avatar.utils";

const test = mergeTests(receiptTest, peerAvatarFixture);

test("Generated avatar (no connected account)", async ({
	faker,
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	peerAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const peerId = faker.string.uuid();
	const { receipt } = await mockReceipt({
		generatePeers: () => [
			{
				id: peerId,
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: undefined,
			},
		],
		generateReceiptItems: () => [],
		generateReceiptPayers: () => [
			{
				peerId,
				part: 1,
				createdAt: Temporal.Now.zonedDateTimeISO(),
			},
		],
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("generated.png", {
		locator: peerAvatar.last(),
	});
});

test("Connected account image", async ({
	faker,
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	peerAvatar,
	mockAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const peer = {
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		publicName: undefined,
		connectedAccount: {
			id: faker.string.uuid(),
			email: faker.internet.email(),
			avatarUrl: mockAvatar,
		},
	};
	const { receipt } = await mockReceipt({
		generatePeers: () => [peer],
		generateReceiptItems: () => [],
		generateReceiptPayers: () => [
			{ peerId: peer.id, part: 1, createdAt: Temporal.Now.zonedDateTimeISO() },
		],
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("connected-account.png", {
		locator: peerAvatar.last(),
	});
});
