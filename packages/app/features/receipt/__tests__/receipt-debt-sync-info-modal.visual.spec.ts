import { test } from "./receipt-debt-sync-info-modal.utils";

test("Receipt debt sync info modal", async ({
	mockReceiptWithDebtsForModal,
	openReceiptWithDebts,
	openDebtsInfoModal,
	debtsInfoModal,
	participantDebtRow,
	expectScreenshotWithSchemes,
}) => {
	const { receipt } = mockReceiptWithDebtsForModal();
	await openReceiptWithDebts(receipt);
	await openDebtsInfoModal();
	await expectScreenshotWithSchemes("modal.png", {
		locator: debtsInfoModal,
		mask: [participantDebtRow],
	});
});
