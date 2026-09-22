import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture, peerFixture);

test("Initial state", async ({
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	debtsGroup,
	peer: peerSelector,
}) => {
	const { fromPeer, toPeer } = await mockDebtsTransfer();
	await openDebtsTransferScreen({
		fromPeerId: fromPeer.id,
		toPeerId: toPeer.id,
	});
	await expectScreenshotWithSchemes("initial.png", {
		mask: [debtsGroup, peerSelector],
	});
});

test("Form with amounts", async ({
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	debtsGroup,
	peer: peerSelector,
	amountInput,
}) => {
	const { fromPeer, toPeer, debts } = await mockDebtsTransfer();
	assert.ok(debts[0]);
	assert.ok(debts[1]);
	await openDebtsTransferScreen({
		fromPeerId: fromPeer.id,
		toPeerId: toPeer.id,
	});
	const firstDebtAmountInput = amountInput(debts[0].currencyCode);
	const secondDebtAmountInput = amountInput(debts[1].currencyCode);
	await firstDebtAmountInput.fill("10");
	await firstDebtAmountInput.press("Tab");
	await secondDebtAmountInput.fill("-10");
	await secondDebtAmountInput.press("Tab");
	await expectScreenshotWithSchemes("with-amounts.png", {
		mask: [debtsGroup, peerSelector],
	});
});
