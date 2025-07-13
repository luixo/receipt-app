import type { Locator } from "@playwright/test";

import type { GenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
import { defaultGenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
import type { GenerateReceipt } from "~tests/frontend/generators/receipts";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
} from "~tests/frontend/generators/receipts";
import type { ExtractFixture } from "~tests/frontend/types";

import { test as originalTest } from "./utils";

type LocalGenerateReceipt = (
	opts: Parameters<GenerateReceipt>[0] & {
		debts: ReturnType<GenerateDebtsFromReceipt>;
	},
) => ReturnType<GenerateReceipt>;

const localDefaultGenerateReceipt: LocalGenerateReceipt = ({
	debts,
	...opts
}) => {
	const generatedReceipt = defaultGenerateReceipt(opts);
	return {
		...generatedReceipt,
		debts: {
			direction: "outcoming",
			debts: debts.map((debt) => ({ id: debt.id, userId: debt.userId })),
		},
	};
};

type MockReceipt = ExtractFixture<typeof originalTest>["mockReceipt"];

type Fixtures = {
	sendDebtButton: Locator;
	updateDebtButton: Locator;
	propagateDebtsButton: Locator;
	updateDebtsButton: Locator;
	syncedDebtsButton: Locator;
	debtSyncStatus: Locator;
	openReceiptWithDebts: (
		receipt: ReturnType<LocalGenerateReceipt>,
	) => Promise<void>;
	mockReceiptWithDebts: (
		options?: Omit<
			NonNullable<Parameters<MockReceipt>[0]>,
			"generateReceipt"
		> & {
			generateDebts?: GenerateDebtsFromReceipt;
			generateReceipt?: LocalGenerateReceipt;
		},
	) => Promise<
		Awaited<ReturnType<MockReceipt>> & {
			debts: ReturnType<GenerateDebtsFromReceipt>;
		}
	>;
};

export const test = originalTest.extend<Fixtures>({
	updateDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Update debt for a user']")),

	sendDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Send debt to a user']")),

	propagateDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Propagate debts']")),

	updateDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Update debts']")),

	syncedDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Synced']")),

	debtSyncStatus: ({ page }, use) => use(page.getByTestId("debt-sync-status")),

	openReceiptWithDebts: ({ openReceipt, awaitCacheKey }, use) =>
		use(async (receipt) => {
			await openReceipt(receipt.id);
			const debtsAmount =
				receipt.debts.direction === "outcoming"
					? receipt.debts.debts.length
					: !receipt.debts.id
						? undefined
						: 1;
			await awaitCacheKey("debts.get", debtsAmount || undefined);
		}),

	mockReceiptWithDebts: (
		{ api, faker, mockReceipt, fromUnitToSubunit, fromSubunitToUnit },
		use,
	) =>
		use(
			async ({
				generateReceiptBase = defaultGenerateReceiptBase,
				generateUsers,
				generateReceiptItems,
				generateReceiptParticipants,
				generateReceiptItemsWithConsumers,
				generateReceiptPayers,
				generateDebts = defaultGenerateDebtsFromReceipt,
				generateReceipt = localDefaultGenerateReceipt,
			} = {}) => {
				const result = await mockReceipt({
					generateReceiptBase,
					generateUsers,
					generateReceiptItems,
					generateReceiptParticipants,
					generateReceiptItemsWithConsumers,
					generateReceiptPayers,
					generateReceipt: defaultGenerateReceipt,
				});
				const debts = generateDebts({
					faker,
					selfUserId: result.selfUserId,
					receiptBase: result.receiptBase,
					receiptItemsWithConsumers: result.receiptItemsWithConsumers,
					participants: result.participants,
					receiptPayers: result.receiptPayers,
					fromUnitToSubunit,
					fromSubunitToUnit,
				});
				const receipt = generateReceipt({
					faker,
					selfUserId: result.selfUserId,
					receiptBase: result.receiptBase,
					receiptItemsWithConsumers: result.receiptItemsWithConsumers,
					receiptParticipants: result.participants,
					receiptPayers: result.receiptPayers,
					users: result.users,
					debts,
				});
				api.mockFirst("receipts.get", ({ input }) => {
					if (input.id !== receipt.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				if (debts.length !== 0) {
					api.mockFirst("debts.get", ({ input }) => {
						const outcomingDebt = debts.find((debt) => debt.id === input.id);
						if (!outcomingDebt) {
							throw new Error(`Unexpected user id in "debts.get": ${input.id}`);
						}
						return outcomingDebt;
					});
				}

				return { ...result, debts };
			},
		),
});
