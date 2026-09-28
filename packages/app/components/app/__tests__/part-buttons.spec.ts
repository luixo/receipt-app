import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

import { test as partButtonsFixture } from "./part-buttons.utils";

const test = mergeTests(receiptTest, partButtonsFixture);

// A receipt with a single item and a single non-self consumer: their
// PartButtons row is rendered first, above the self consumer row.
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
			consumeType: null,
			name: item.name,
			createdAt: item.createdAt,
			consumers: participants.map((participant, index) => ({
				createdAt: item.createdAt.add({ seconds: index + 1 }),
				peerId: participant.peerId,
				part,
			})),
			payers: [],
		}));

test("Clicking up increases the consumer's part", async ({
	api,
	mockReceipt,
	openReceipt,
	partButtonsUp,
	awaitCacheKey,
	snapshotQueries,
}) => {
	api.mockFirst("receiptItemConsumers.update", undefined);
	const { receipt } = await mockReceipt({
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(2),
	});
	await openReceipt(receipt);

	await snapshotQueries(async () => {
		await partButtonsUp.first().click();
		await awaitCacheKey("receiptItemConsumers.update");
	});
});

test("Down button is disabled when the part is at the minimum", async ({
	mockReceipt,
	openReceipt,
	partButtonsDown,
	partButtonsUp,
}) => {
	const { receipt } = await mockReceipt({
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(1),
	});
	await openReceipt(receipt);
	await expect(partButtonsDown.first()).toBeDisabled();
	await expect(partButtonsUp.first()).toBeEnabled();
});

test("Receipt percent default renders editable consumer sliders", async ({
	api,
	mockReceipt,
	openReceipt,
	page,
	changeSlider,
	awaitCacheKey,
}) => {
	api.mockFirst("receiptItemConsumers.update", undefined);
	const { receipt } = await mockReceipt({
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(1),
		generateReceipt: (options) => ({
			...defaultGenerateReceipt(options),
			consumeType: "percent",
		}),
	});
	await openReceipt(receipt);
	const slider = page
		.getByRole("slider", { name: "Item consumer part" })
		.first();
	await expect(slider).toBeVisible();
	await changeSlider(slider, 0.7);
	await awaitCacheKey("receiptItemConsumers.update");
	await expect(page.getByText("50%", { exact: true })).toHaveCount(0);
});

test("Item amount override renders an editable amount slider", async ({
	api,
	mockReceipt,
	openReceipt,
	page,
	changeSlider,
	awaitCacheKey,
}) => {
	api.mockFirst("receiptItemConsumers.update", undefined);
	const { receipt } = await mockReceipt({
		generatePeers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: (options) =>
			generateReceiptItemsWithConsumers(1)(options).map((item) => ({
				...item,
				consumeType: "amount",
			})),
	});
	await openReceipt(receipt);
	const slider = page
		.getByRole("slider", { name: "Item consumer part" })
		.first();
	await expect(slider).toBeVisible();
	await changeSlider(slider, 0.7);
	await awaitCacheKey("receiptItemConsumers.update");
});
