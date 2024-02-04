import {
	generateDebtsWith,
	ourDesynced,
	ourNonExistent,
} from "./debts.generators";
import { test } from "./debts.utils";
import { defaultGenerateUsers } from "./generators";

test("Propagate & modal info buttons", async ({
	api,
	mockReceiptWithDebts,
	openReceipt,
	propagateDebtsButton,
	updateDebtsButton,
	updateDebtButton,
	debtsInfoModalButton,
	openDebtsInfoModal,
	closeDebtsInfoModal,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	skip,
}, testInfo) => {
	skip(testInfo, "only-smallest");
	const { receipt } = mockReceiptWithDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("buttons.png", {
		locator: [updateDebtsButton, debtsInfoModalButton],
	});
	await openDebtsInfoModal();
	api.mock("debts.update", {
		lockedTimestamp: new Date(),
		reverseLockedTimestampUpdated: true,
	});
	await updateDebtButton.click();
	await closeDebtsInfoModal();
	await awaitCacheKey("debts.update");
	await expectScreenshotWithSchemes("propagate-send-button.png", {
		locator: propagateDebtsButton,
	});
});
