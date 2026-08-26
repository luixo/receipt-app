import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import type { UserId } from "~db/ids";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateReceiptItems } from "~tests/frontend/generators/receipts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { add } from "~utils/date";

import { test as partButtonsFixture } from "./part-buttons.utils";

const test = mergeTests(receiptTest, partButtonsFixture);

const generateUsers: GenerateUsers = ({ faker }) => [
	{
		id: faker.string.uuid() as UserId,
		name: "Other user",
		publicName: undefined,
		connectedAccount: undefined,
	},
];

const generateReceiptItems: GenerateReceiptItems = (opts) =>
	defaultGenerateReceiptItems(opts).slice(0, 1);

const generateReceiptItemsWithConsumers =
	(part: number): GenerateReceiptItemsWithConsumers =>
	({ receiptItems, participants }) =>
		receiptItems.map((item) => ({
			id: item.id,
			price: item.price,
			quantity: item.quantity,
			name: item.name,
			createdAt: item.createdAt,
			consumers: participants.map((participant, index) => ({
				createdAt: add.zonedDateTime(item.createdAt, { seconds: index + 1 }),
				userId: participant.userId,
				part,
			})),
			payers: [],
		}));

test("Both buttons enabled", async ({
	mockReceipt,
	openReceipt,
	partButtons,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(2),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("enabled.png", {
		locator: partButtons,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				// PartButtons sits inside a receipt item Card, whose background isn't the page background.
				rgb: colorMode === "light" ? expectedPixels[0].rgb : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Down button disabled", async ({
	mockReceipt,
	openReceipt,
	partButtons,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(1),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("down-disabled.png", {
		locator: partButtons,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				// PartButtons sits inside a receipt item Card, whose background isn't the page background.
				rgb: colorMode === "light" ? expectedPixels[0].rgb : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});
