import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test as peerAvatarFixture } from "./peer-avatar.utils";

const test = mergeTests(receiptTest, peerAvatarFixture);

test("Renders a generated avatar for a peer without a connected account", async ({
	faker,
	mockReceipt,
	openReceipt,
	peerAvatar,
}) => {
	const [peer] = defaultGeneratePeers({ faker, amount: 1 });
	assert.ok(peer);
	const { receipt } = await mockReceipt({
		generatePeers: () => [peer],
		generateReceiptItems: () => [],
		// The only payer, so their (non-dimmed) avatar is the "payed by" preview.
		generateReceiptPayers: () => [
			{ peerId: peer.id, part: 1, createdAt: Temporal.Now.zonedDateTimeISO() },
		],
	});
	await openReceipt(receipt);
	const payerAvatar = peerAvatar.last();
	await expect(payerAvatar).toBeVisible();
	await expect(payerAvatar).not.toHaveClass(/grayscale/);
	await expect(payerAvatar.locator("img")).not.toBeAttached();
});

test("Renders the connected account image when an avatar url is set", async ({
	faker,
	mockReceipt,
	openReceipt,
	peerAvatar,
	mockAvatar,
}) => {
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
	const payerAvatar = peerAvatar.last();
	const image = payerAvatar.locator("img").first();
	await expect(image).toHaveAttribute("src", mockAvatar);
});
