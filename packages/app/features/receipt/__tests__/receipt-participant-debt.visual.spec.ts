import {
	defaultGenerateReceiptItemsParts,
	generateDebtsMapped,
	ourDesynced,
	ourNonExistent,
	theirDesynced,
	theirSynced,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./receipt-participant-debt.utils";

test("Receipt participant debt", async ({
	openReceipt,
	mockReceiptWithDebts,
	participantDebtRow,
	debtSyncStatus,
	openDebtsInfoModal,
	expectScreenshotWithSchemes,
	user,
}) => {
	const { receipt } = mockReceiptWithDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
		generateDebts: generateDebtsMapped(ourDesynced),
	});
	await openReceipt(receipt.id);
	await openDebtsInfoModal();
	await expectScreenshotWithSchemes("row.png", {
		locator: participantDebtRow.first(),
		mask: [debtSyncStatus, user],
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
		generateDebts: generateDebtsMapped(ourDesynced, [
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
		generateDebts: generateDebtsMapped([ourDesynced, ourNonExistent]),
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
