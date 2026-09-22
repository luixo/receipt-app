import { mergeTests } from "@playwright/test";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture, peerFixture);

test("Screen", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	peer: peerSelector,
	debtsGroup,
}) => {
	const { debtPeer } = await mockDebts();
	await openDebtsExchangeScreen(debtPeer.id);
	await expectScreenshotWithSchemes("wrapper.png", {
		mask: [debtsGroup, peerSelector],
	});
});
