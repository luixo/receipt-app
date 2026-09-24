import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";

import { mockPeerReceipts, test } from "./utils";

test("Shows empty state when peer has no receipts", async ({
	mockBase,
	openPeerScreen,
	receiptsHeader,
	receiptsEmpty,
	peerReceiptPreview,
}) => {
	const { targetPeer } = await mockBase();
	await openPeerScreen(targetPeer.id);

	await expect(receiptsEmpty).toBeVisible();
	await expect(receiptsHeader).not.toBeAttached();
	await expect(peerReceiptPreview).toHaveCount(0);
});

test("Lists shared receipts with links to receipt pages", async ({
	mockBase,
	openPeerScreen,
	awaitCacheKey,
	page,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	receiptsHeader,
	peerReceiptPreview,
	peerReceiptDebtStatus,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	const { receipts } = mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
	});
	const [firstReceipt, secondReceipt] = receipts;
	assert.ok(firstReceipt);
	assert.ok(secondReceipt);
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", receipts.length);

	await expect(receiptsHeader).toBeVisible();
	await expect(peerReceiptPreview).toHaveCount(receipts.length);
	for (const receipt of receipts) {
		await expect(
			peerReceiptPreview.filter({ hasText: receipt.name }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: new RegExp(receipt.name) }),
		).toHaveAttribute("href", new RegExp(receipt.id));
	}
	// No debts propagated yet, both receipts show unsynced status
	await expect(peerReceiptDebtStatus).toHaveCount(receipts.length);
});

test("Shows debt status when debts match the receipt", async ({
	mockBase,
	openPeerScreen,
	awaitCacheKey,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	peerReceiptDebtStatus,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
		amount: 1,
		generateDebts: defaultGenerateDebtsFromReceipt,
	});
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", 1);
	await awaitCacheKey("debts.get", 1);

	await expect(peerReceiptDebtStatus).toHaveCount(1);
});

test("Hides debt status for third-party receipts", async ({
	mockBase,
	openPeerScreen,
	awaitCacheKey,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	peerReceiptPreview,
	peerReceiptDebtStatus,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	const { receipts } = mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
		amount: 1,
		mutateReceipt: (receipt) => ({
			...receipt,
			ownerPeerId: faker.string.uuid(),
			debts: {
				direction: "incoming",
				id: undefined,
				hasMine: false,
				hasForeign: false,
			},
		}),
	});
	const [receipt] = receipts;
	assert.ok(receipt);
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", 1);

	await expect(
		peerReceiptPreview.filter({ hasText: receipt.name }),
	).toBeVisible();
	await expect(peerReceiptDebtStatus).toHaveCount(0);
});

test("Hides debt status when there is nothing to exchange", async ({
	mockBase,
	openPeerScreen,
	awaitCacheKey,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	peerReceiptPreview,
	peerReceiptDebtStatus,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	const { receipts } = mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
		amount: 1,
		generateReceiptItems: () => [],
	});
	const [receipt] = receipts;
	assert.ok(receipt);
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", 1);

	await expect(
		peerReceiptPreview.filter({ hasText: receipt.name }),
	).toBeVisible();
	await expect(peerReceiptDebtStatus).toHaveCount(0);
});

test("Paginates shared receipts", async ({
	mockBase,
	openPeerScreen,
	awaitCacheKey,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	peerReceiptPreview,
	paginationBlock,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	const { receipts } = mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
		amount: 11,
	});
	const firstReceipt = receipts.at(0);
	const lastReceipt = receipts.at(-1);
	assert.ok(firstReceipt);
	assert.ok(lastReceipt);
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", 10);

	await expect(paginationBlock).toBeVisible();
	await expect(
		peerReceiptPreview.filter({ hasText: firstReceipt.name }),
	).toBeVisible();
	await expect(
		peerReceiptPreview.filter({ hasText: lastReceipt.name }),
	).toBeHidden();

	await paginationBlock
		.getByRole("button", { name: "pagination item 2" })
		.click();
	await awaitCacheKey("receipts.getByPeerPaged", {
		input: { peerId: targetPeer.id, cursor: 10, limit: 10 },
	});
	await expect(
		peerReceiptPreview.filter({ hasText: lastReceipt.name }),
	).toBeVisible();
	await expect(
		peerReceiptPreview.filter({ hasText: firstReceipt.name }),
	).toBeHidden();
});

test("'receipts.getByPeerPaged' error shows error message", async ({
	mockBase,
	openPeerScreen,
	api,
	errorMessage,
	awaitCacheKey,
	consoleManager,
}) => {
	const { targetPeer } = await mockBase();
	const mockErrorMessage = `Mock "getByPeerPaged" error`;
	api.mockFirst("receipts.getByPeerPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);

	await openPeerScreen(targetPeer.id, { awaitCache: false });
	await awaitCacheKey("receipts.getByPeerPaged", { error: 1 });
	await expect(errorMessage(mockErrorMessage)).toBeVisible();
});
