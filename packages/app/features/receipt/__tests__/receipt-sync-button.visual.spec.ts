import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	ourNonExistent,
	remapDebts,
} from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./debts.utils";

test("Propagate state", async ({
	mockReceiptWithDebts,
	openReceipt,
	propagateDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-smallest");
	const { receipt } = mockReceiptWithDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: (opts) =>
			remapDebts(ourNonExistent)(defaultGenerateDebtsFromReceipt(opts)),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("propagate.png", {
		locator: [propagateDebtsButton],
	});
});

test("Sync state", async ({
	mockReceiptWithDebts,
	openReceipt,
	updateDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-smallest");
	const { receipt } = mockReceiptWithDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("sync.png", {
		locator: [updateDebtsButton],
	});
});

test("Synced state", async ({
	mockReceiptWithDebts,
	openReceipt,
	syncedDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-smallest");
	const { receipt } = mockReceiptWithDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
	});
	await openReceipt(receipt.id);
	await expectScreenshotWithSchemes("synced.png", {
		locator: [syncedDebtsButton],
	});
});
