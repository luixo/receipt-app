import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	ourNonExistent,
	remapDebts,
} from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./debts.utils";

test("Propagate state", async ({
	mockReceipt,
	openReceipt,
	propagateDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: (opts) =>
			remapDebts(ourNonExistent)(defaultGenerateDebtsFromReceipt(opts)),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("propagate.png", {
		locator: [propagateDebtsButton],
	});
});

test("Sync state", async ({
	mockReceipt,
	openReceipt,
	updateDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: (opts) =>
			remapDebts(ourDesynced)(defaultGenerateDebtsFromReceipt(opts)),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("sync.png", {
		locator: [updateDebtsButton],
	});
});

test("Synced state", async ({
	mockReceipt,
	openReceipt,
	syncedDebtsButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("synced.png", {
		locator: [syncedDebtsButton],
	});
});
