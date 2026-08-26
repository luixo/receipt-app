import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import { getNow } from "~utils/date";

import { test as userAvatarFixture } from "./user-avatar.utils";

const test = mergeTests(receiptTest, userAvatarFixture);

test("Renders a generated avatar for a user without a connected account", async ({
	faker,
	mockReceipt,
	openReceipt,
	userAvatar,
}) => {
	const [user] = defaultGenerateUsers({ faker, amount: 1 });
	assert(user);
	const { receipt } = await mockReceipt({
		generateUsers: () => [user],
		generateReceiptItems: () => [],
		// The only payer, so their (non-dimmed) avatar is the "payed by" preview.
		generateReceiptPayers: () => [
			{ userId: user.id, part: 1, createdAt: getNow.zonedDateTime() },
		],
	});
	await openReceipt(receipt.id);
	const payerAvatar = userAvatar.last();
	await expect(payerAvatar).toBeVisible();
	await expect(payerAvatar).not.toHaveClass(/grayscale/);
	await expect(payerAvatar.locator("img")).not.toBeAttached();
});

test("Renders the connected account image when an avatar url is set", async ({
	faker,
	mockReceipt,
	openReceipt,
	userAvatar,
	mockAvatar,
}) => {
	const user = {
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
		generateUsers: () => [user],
		generateReceiptItems: () => [],
		generateReceiptPayers: () => [
			{ userId: user.id, part: 1, createdAt: getNow.zonedDateTime() },
		],
	});
	await openReceipt(receipt.id);
	const payerAvatar = userAvatar.last();
	const image = payerAvatar.locator("img").first();
	await expect(image).toHaveAttribute("src", mockAvatar);
});
