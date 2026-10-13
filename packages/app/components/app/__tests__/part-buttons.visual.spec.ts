import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateReceiptItems } from "~tests/frontend/generators/receipts";

import { test as partButtonsFixture } from "./part-buttons.utils";

const test = mergeTests(receiptTest, partButtonsFixture);

const generatePeers: GeneratePeers = ({ faker }) => [
	{
		id: faker.string.uuid(),
		name: "Other peer",
		publicName: undefined,
		connectedUser: undefined,
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
				createdAt: item.createdAt.add({ seconds: index + 1 }),
				peerId: participant.peerId,
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
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(2),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("enabled.png", {
		locator: partButtons,
		pixelsPreset: "surface",
	});
});

test("Down button enabled at one", async ({
	mockReceipt,
	openReceipt,
	partButtons,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(1),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("down-enabled-at-one.png", {
		locator: partButtons,
		pixelsPreset: "surface",
	});
});
