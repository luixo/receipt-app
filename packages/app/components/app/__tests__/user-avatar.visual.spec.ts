import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { getNow } from "~utils/date";

import { test as userAvatarFixture } from "./user-avatar.utils";

const test = mergeTests(receiptTest, userAvatarFixture);

test("Generated avatar (no connected account)", async ({
	faker,
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	userAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const userId = faker.string.uuid();
	const { receipt } = await mockReceipt({
		generateUsers: () => [
			{
				id: userId,
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: undefined,
			},
		],
		generateReceiptItems: () => [],
		generateReceiptPayers: () => [
			{
				userId,
				part: 1,
				createdAt: getNow.zonedDateTime(),
			},
		],
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("generated.png", {
		locator: userAvatar.last(),
	});
});

test("Connected account image", async ({
	faker,
	mockReceipt,
	openReceipt,
	expectScreenshotWithSchemes,
	userAvatar,
	mockAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
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
	await expectScreenshotWithSchemes("connected-account.png", {
		locator: userAvatar.last(),
	});
});
