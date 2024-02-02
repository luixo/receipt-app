import {
	generateDebtsWith,
	ourDesynced,
	ourNonExistent,
	theirDesynced,
	theirSynced,
} from "./debts.generators";
import {
	defaultGenerateReceiptItemsParts,
	defaultGenerateUsers,
} from "./generators";
import { test } from "./receipt-participant-debt.utils";

test.describe("Receipt participant debt - visual", () => {
	test("Row view", async ({
		openReceipt,
		mockReceiptWithDebts,
		participantDebtRow,
		debtSyncStatus,
		openDebtsInfoModal,
		expectScreenshotWithSchemes,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
			generateDebts: generateDebtsWith(ourDesynced),
		});
		await openReceipt(receipt.id);
		await openDebtsInfoModal();
		await expectScreenshotWithSchemes("row.png", {
			locator: participantDebtRow.first(),
			mask: [debtSyncStatus, participantDebtRow.getByTestId("user")],
		});
	});

	test("Status icon", async ({
		openReceipt,
		mockReceiptWithDebts,
		participantDebtStatusIcon,
		debtSyncStatus,
		openDebtsInfoModal,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-smallest");
		const { receipt } = mockReceiptWithDebts({
			// We need at least 1 desynced user to open a modal
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 3 }),
			generateDebts: generateDebtsWith(ourDesynced, [
				theirDesynced,
				theirSynced,
			]),
			generateReceiptItemsParts: (opts) =>
				// Creating a 0 sum participant
				defaultGenerateReceiptItemsParts({
					...opts,
					participants: opts.participants.slice(1),
				}),
		});
		await openReceipt(receipt.id);
		await openDebtsInfoModal();
		await expectScreenshotWithSchemes("status-icon/mismatch.png", {
			locator: participantDebtStatusIcon.nth(0),
			mask: [debtSyncStatus],
		});
		await expectScreenshotWithSchemes("status-icon/mismatch.png", {
			locator: participantDebtStatusIcon.nth(1),
			mask: [debtSyncStatus],
		});
		await expectScreenshotWithSchemes("status-icon/zero-sum.png", {
			locator: participantDebtStatusIcon.nth(2),
			mask: [debtSyncStatus],
		});
	});

	test("Actions", async ({
		openReceipt,
		mockReceiptWithDebts,
		participantDebtAction,
		openDebtsInfoModal,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-smallest");
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
			generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
		});
		await openReceipt(receipt.id);
		await openDebtsInfoModal();
		await expectScreenshotWithSchemes("action/add.png", {
			locator: participantDebtAction.nth(0),
		});
		await expectScreenshotWithSchemes("action/update.png", {
			locator: participantDebtAction.nth(1),
		});
	});
});
