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
		debt: {
			direction: "outcoming",
			ids: debts.map((debt) => debt.id),
		},
	};
};

type MockReceipt = ExtractFixture<typeof originalTest>["mockReceipt"];

type Fixtures = {
	sendDebtButton: Locator;
	updateDebtButton: Locator;
	propagateDebtsButton: Locator;
	updateDebtsButton: Locator;
	debtsInfoModalButton: Locator;
	debtsInfoModal: Locator;
	openDebtsInfoModal: () => Promise<void>;
	closeDebtsInfoModal: () => Promise<void>;
	participantDebtRow: Locator;
	participantDebtStatusIcon: Locator;
	participantDebtAction: Locator;
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
	) => ReturnType<MockReceipt> & {
		debts: ReturnType<GenerateDebtsFromReceipt>;
	};
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

	debtsInfoModalButton: ({ page }, use) =>
		use(page.locator("button[title='Show sync status']")),

	debtsInfoModal: ({ modal }, use) => use(modal("Receipt sync status")),

	participantDebtRow: ({ page }, use) =>
		use(page.locator("[data-testid='participant-debt']:visible")),

	participantDebtStatusIcon: ({ page }, use) =>
		use(page.getByTestId("participant-debt-status-icon")),

	participantDebtAction: ({ page }, use) =>
		use(page.getByTestId("participant-debt-action")),

	debtSyncStatus: ({ page }, use) => use(page.getByTestId("debt-sync-status")),

	openDebtsInfoModal: ({ debtsInfoModalButton, debtsInfoModal }, use) =>
		use(async () => {
			await debtsInfoModalButton.click();
			await debtsInfoModal.waitFor();
		}),

	closeDebtsInfoModal: ({ modalCross, debtsInfoModal }, use) =>
		use(async () => {
			await modalCross.click();
			await debtsInfoModal.waitFor({ state: "detached" });
		}),

	openReceiptWithDebts: ({ openReceipt, awaitCacheKey }, use) =>
		use(async (receipt) => {
			await openReceipt(receipt.id);
			const debtsAmount =
				receipt.debt.direction === "outcoming"
					? receipt.debt.ids.length
					: !receipt.debt.id
					? 0
					: 1;
			await awaitCacheKey({ path: "debts.get", amount: debtsAmount });
		}),

	mockReceiptWithDebts: ({ api, faker, mockReceipt }, use) =>
		use(
			({
				generateSelfAccount,
				generateReceiptBase,
				generateUsers,
				generateReceiptItems,
				generateReceiptParticipants,
				generateReceiptItemsParts,
				generateDebts = defaultGenerateDebtsFromReceipt,
				generateReceipt = localDefaultGenerateReceipt,
			} = {}) => {
				const result = mockReceipt({
					generateSelfAccount,
					generateReceiptBase:
						generateReceiptBase ||
						((opts) => ({
							...defaultGenerateReceiptBase(opts),
							lockedTimestamp: new Date(),
						})),
					generateUsers,
					generateReceiptItems,
					generateReceiptParticipants,
					generateReceiptItemsParts,
					generateReceipt: defaultGenerateReceipt,
				});
				const debts = generateDebts({
					faker,
					selfAccount: result.selfAccount,
					receiptBase: result.receiptBase,
					receiptItemsParts: result.receiptItemsParts,
					participants: result.participants,
				});
				const receipt = generateReceipt({
					faker,
					selfAccount: result.selfAccount,
					receiptBase: result.receiptBase,
					receiptItemsParts: result.receiptItemsParts,
					receiptParticipants: result.participants,
					users: result.users,
					debts,
				});
				api.mock("receipts.get", (input) => {
					if (input.id !== receipt.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				if (debts.length !== 0) {
					api.mock("debts.get", (input) => {
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
