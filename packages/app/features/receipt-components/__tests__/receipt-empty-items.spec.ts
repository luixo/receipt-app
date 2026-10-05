import assert from "node:assert";

import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
	defaultGenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { round } from "~utils/math";

import { test, timestampedItems } from "./receipt-items.utils";

test("Only unconsumed items appear in source order, with rounded quantity × price", async ({
	mockReceipt,
	openReceipt,
	warningRows,
	warningSection,
	itemCards,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptItems: (options) =>
			timestampedItems(defaultGenerateReceiptItems(options).slice(0, 3)),
		generateReceiptItemsWithConsumers: (options) =>
			defaultGenerateReceiptItemsWithConsumers(options).map((item, index) => ({
				...item,
				consumers: index === 1 ? item.consumers : [],
			})),
		generateReceipt: (options) => {
			const [first, consumed, last] = options.receiptItemsWithConsumers;
			assert.ok(first && consumed && last);
			return {
				...defaultGenerateReceipt(options),
				items: [last, consumed, first],
			};
		},
	});
	const [last, , first] = receipt.items;
	assert.ok(first && last);
	await openReceipt(receipt);
	await expect(warningSection).toBeVisible();
	await expect(warningRows).toHaveCount(2);
	for (const [index, item] of [last, first].entries()) {
		await expect(warningRows.nth(index)).toHaveAccessibleName(
			`${item.name} — ${formatCurrency(localSettings.locale, receipt.currencyCode, round(item.quantity * item.price))}`,
		);
		await expect(warningRows.nth(index)).toBeChecked();
	}
	await expect(itemCards).toHaveCount(3);
});

test("Selecting a warning scrolls the matching item card into view without consuming it", async ({
	mockReceipt,
	openReceipt,
	warningRow,
	warningRows,
	itemCards,
	itemCardNames,
	getScrollPosition,
	snapshotQueries,
	faker,
}) => {
	const noConsumerIndex = faker.number.int({ min: 0, max: 5 });
	const { receipt } = await mockReceipt({
		generateReceiptItems: (options) =>
			timestampedItems(
				[
					...defaultGenerateReceiptItems(options),
					...defaultGenerateReceiptItems(options),
				].slice(0, noConsumerIndex + 1),
			),
		generateReceiptItemsWithConsumers: (options) =>
			defaultGenerateReceiptItemsWithConsumers(options).map((item, index) => ({
				...item,
				consumers: index === noConsumerIndex ? [] : item.consumers,
			})),
	});
	const target = receipt.items.at(noConsumerIndex);
	assert.ok(target);
	await openReceipt(receipt);
	await expect(warningRows).toHaveCount(1);
	const row = warningRow(target.name);
	const card = itemCards.nth(noConsumerIndex);
	await expect(itemCardNames.nth(noConsumerIndex)).toHaveValue(target.name);
	const scrollPosition = () => getScrollPosition(card);
	const before = await scrollPosition();
	await snapshotQueries(async () => {
		await row.click();
		await expect.poll(scrollPosition).toBeGreaterThan(before);
		await expect(card).toBeInViewport();
	});
});
