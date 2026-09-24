import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";

import { test as peerAvatarFixture } from "./peer-avatar.utils";

const test = mergeTests(receiptTest, peerAvatarFixture);

test("Generated avatar (no connected  user)", async ({
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
				connectedUser: undefined,
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

test("Connected  user image", async ({
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
		connectedUser: {
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
	await expectScreenshotWithSchemes("connected- user.png", {
		locator: peerAvatar.last(),
	});
});
