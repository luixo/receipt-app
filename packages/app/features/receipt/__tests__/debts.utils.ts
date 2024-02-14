import type { Locator } from "@playwright/test";

import type { ExtractFixture } from "@tests/frontend/fixtures";
import type { ReceiptsId } from "next-app/db/models";

import type { GenerateDebts } from "./debts.generators";
import { defaultGenerateDebts } from "./debts.generators";
import type { GenerateReceipt } from "./generators";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
} from "./generators";
import { test as originalTest } from "./utils";

type LocalGenerateReceipt = (
	opts: Parameters<GenerateReceipt>[0] & { debts: ReturnType<GenerateDebts> },
) => ReturnType<GenerateReceipt>;

const localDefaultGenerateReceipt: LocalGenerateReceipt = ({
	debts,
	...opts
}) => {
	const generatedReceipt = defaultGenerateReceipt(opts);
	return {
		...generatedReceipt,
		debt:
			generatedReceipt.lockedTimestamp && debts && debts.length !== 0
				? {
						direction: "outcoming",
						ids: debts.map((debt) => debt.id),
				  }
				: undefined,
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
	openReceiptWithDebts: (receiptId: ReceiptsId) => Promise<void>;
	mockReceiptWithDebts: (
		options?: Omit<
			NonNullable<Parameters<MockReceipt>[0]>,
			"generateReceipt"
		> & {
			generateDebts?: GenerateDebts;
			generateReceipt?: LocalGenerateReceipt;
		},
	) => ReturnType<MockReceipt> & {
		debts: ReturnType<GenerateDebts>;
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
		use(async (receiptId) => {
			await openReceipt(receiptId);
			await awaitCacheKey("debts.get");
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
				generateDebts = defaultGenerateDebts,
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
