import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as currenciesPickerFixture } from "~app/components/app/__tests__/currencies-picker.utils";
import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./utils";

const test = mergeTests(
	localTest,
	debtsGroupFixture,
	peerFixture,
	currenciesPickerFixture,
);

test("No debts", async ({
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	transferForm,
}) => {
	const { fromPeer, toPeer } = await mockDebtsTransfer({
		generateDebts: () => [],
	});
	await openDebtsTransferScreen({
		fromPeerId: fromPeer.id,
		toPeerId: toPeer.id,
	});
	await expectScreenshotWithSchemes("no-debts.png", { locator: transferForm });
});

test("Mixed amounts, resolved debt and added currency", async ({
	api,
	openDebtsTransferScreen,
	expectScreenshotWithSchemes,
	mockDebtsTransfer,
	debtsGroup,
	peer: peerSelector,
	showResolvedDebtsSwitch,
	allMaxButton,
	addCurrencyButton,
	currencyButton,
	amountInput,
}) => {
	const { fromPeer, toPeer } = await mockDebtsTransfer({
		generateDebts: (opts) => {
			const [first, second, third, fourth] = defaultGenerateDebts({
				...opts,
				amount: 4,
			});
			assert.ok(first);
			assert.ok(second);
			assert.ok(third);
			assert.ok(fourth);
			return [
				{ ...first, currencyCode: "USD", amount: 10 },
				{ ...second, currencyCode: "USD", amount: -10 },
				{ ...third, currencyCode: "EUR", amount: 25 },
				{ ...fourth, currencyCode: "GBP", amount: -15 },
			];
		},
	});
	await openDebtsTransferScreen({
		fromPeerId: fromPeer.id,
		toPeerId: toPeer.id,
	});
	await showResolvedDebtsSwitch.click();
	await allMaxButton.click();
	api.mockFirst("currency.top", { items: [] });
	await addCurrencyButton.click();
	await currencyButton("JPY").click();
	await amountInput("JPY").fill("12");
	await amountInput("JPY").press("Tab");
	await amountInput("JPY").focus();
	await expectScreenshotWithSchemes("mixed-amounts.png", {
		mask: [debtsGroup, peerSelector, showResolvedDebtsSwitch],
	});
});
