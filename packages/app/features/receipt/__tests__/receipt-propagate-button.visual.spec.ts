import {
	generateDebtsMapped,
	ourDesynced,
	ourNonExistent,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./debts.utils";

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
		generateDebts: generateDebtsMapped([ourDesynced, ourNonExistent]),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("buttons.png", {
		locator: [updateDebtsButton, debtsInfoModalButton],
	});
	await openDebtsInfoModal();
	api.mock("debts.update", {
		updatedAt: new Date(),
		reverseUpdated: true,
	});
	await updateDebtButton.click();
	await closeDebtsInfoModal();
	await awaitCacheKey("debts.update");
	await expectScreenshotWithSchemes("propagate-send-button.png", {
		locator: propagateDebtsButton,
	});
});
