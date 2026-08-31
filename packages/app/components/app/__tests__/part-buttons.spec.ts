import { mergeTests } from "@playwright/test";

import { test as receiptTest } from "~app/features/receipt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";
import type {
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateReceiptItems } from "~tests/frontend/generators/receipts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { add } from "~utils/date";

import { test as partButtonsFixture } from "./part-buttons.utils";

const test = mergeTests(receiptTest, partButtonsFixture);

// A receipt with a single item and a single non-self consumer: their
// PartButtons row is rendered first, above the self consumer row.
const generateUsers: GenerateUsers = ({ faker }) => [
	{
		id: faker.string.uuid(),
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

test("Clicking up increases the consumer's part", async ({
	api,
	mockReceipt,
	openReceipt,
	partButtonsUp,
	awaitCacheKey,
	snapshotQueries,
}) => {
	api.mockFirst("receiptItemConsumers.update", () => undefined);
	const { receipt } = await mockReceipt({
		generateUsers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(2),
	});
	await openReceipt(receipt.id);

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
		generateUsers,
		generateReceiptItems,
		generateReceiptItemsWithConsumers: generateReceiptItemsWithConsumers(1),
	});
	await openReceipt(receipt.id);
	await expect(partButtonsDown.first()).toBeDisabled();
	await expect(partButtonsUp.first()).toBeEnabled();
});
