import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { test as userFixture } from "~app/components/app/__tests__/user.utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture, userFixture);

test("Initial state", async ({
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	debtsGroup,
	user: userSelector,
}) => {
	const { fromUser, toUser } = await mockDebtsTransfer();
	await openDebtsTransferScreen({
		fromUserId: fromUser.id,
		toUserId: toUser.id,
	});
	await expectScreenshotWithSchemes("initial.png", {
		mask: [debtsGroup, userSelector],
	});
});

test("Form with amounts", async ({
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	debtsGroup,
	user: userSelector,
	amountInput,
}) => {
	const { fromUser, toUser, debts } = await mockDebtsTransfer();
	assert.ok(debts[0]);
	assert.ok(debts[1]);
	await openDebtsTransferScreen({
		fromUserId: fromUser.id,
		toUserId: toUser.id,
	});
	const firstDebtAmountInput = amountInput(debts[0].currencyCode);
	const secondDebtAmountInput = amountInput(debts[1].currencyCode);
	await firstDebtAmountInput.fill("10");
	await firstDebtAmountInput.press("Tab");
	await secondDebtAmountInput.fill("-10");
	await secondDebtAmountInput.press("Tab");
	await expectScreenshotWithSchemes("with-amounts.png", {
		mask: [debtsGroup, userSelector],
	});
});
