import { test } from "./receipt-debt-sync-info-modal.utils";

test.describe("Receipt debt sync info modal - visual", () => {
	test("View", async ({
		mockReceiptWithDebtsForModal,
		openReceiptWithDebts,
		openDebtsInfoModal,
		debtsInfoModal,
		participantDebtRow,
		expectScreenshotWithSchemes,
	}) => {
		const { receipt } = mockReceiptWithDebtsForModal();
		await openReceiptWithDebts(receipt.id);
		await openDebtsInfoModal();
		await expectScreenshotWithSchemes("modal.png", {
			locator: debtsInfoModal,
			mask: [participantDebtRow],
		});
	});
});
