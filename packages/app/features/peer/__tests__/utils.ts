import type { Locator } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import type { Receipt } from "~app/trpc-types";
import type { PeerId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import type {
	GenerateReceipt,
	GenerateReceiptBase,
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
	GenerateReceiptParticipants,
	GenerateReceiptPayers,
} from "~tests/frontend/generators/receipts";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptItems,
	defaultGenerateReceiptItemsWithConsumers,
	defaultGenerateReceiptParticipants,
	defaultGenerateReceiptPayers,
} from "~tests/frontend/generators/receipts";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	mockBase: () => Promise<{
		targetPeer: ReturnType<GeneratePeers>[number];
		selfPeer: { id: PeerId };
	}>;
	openPeerScreen: (
		id: PeerId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
	peerPreview: Locator;
	nameInput: Locator;
	saveNameButton: Locator;
	addPublicNameButton: Locator;
	publicNameInput: Locator;
	savePublicNameButton: Locator;
	removePublicNameButton: Locator;
	connectButton: Locator;
	connectionEmailInput: Locator;
	linkButton: Locator;
	unlinkButton: Locator;
	cancelRequestButton: Locator;
	outboundRequestInput: Locator;
	removePeerButton: Locator;
	removePeerDialog: Locator;
	receiptsHeader: Locator;
	receiptsEmpty: Locator;
	peerReceiptPreview: Locator;
	peerReceiptDebtStatus: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			const { peer: selfPeer } = await api.mockUtils.authPage();
			const [targetPeer] = defaultGeneratePeers({ faker, amount: 1 });
			assert.ok(targetPeer);
			api.mockUtils.mockPeers(targetPeer);
			api.mockFirst("receipts.getByPeerPaged", {
				items: [],
				count: 0,
				cursor: 0,
			});
			return { targetPeer, selfPeer };
		}),

	openPeerScreen: ({ page, awaitCacheKey }, use) =>
		use(async (id, { awaitCache = true } = {}) => {
			await page.navigate({ to: "/peers/$id", params: { id } });
			if (awaitCache) {
				await awaitCacheKey("peers.get");
			}
		}),

	peerPreview: ({ page }, use) => use(page.getByTestId("peer")),

	nameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Peer name" })),
	saveNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save peer name" })),

	addPublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add public name" })),
	publicNameInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Public peer name" })),
	savePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save peer public name" })),
	removePublicNameButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove peer public name" })),

	connectButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Connect to an account" })),
	connectionEmailInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Email" })),
	linkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Link peer to email" })),
	unlinkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Unlink peer from email" })),
	cancelRequestButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Cancel request" })),
	outboundRequestInput: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Outbound request" })),

	removePeerButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove peer" })),
	removePeerDialog: ({ modal }, use) => use(modal("Remove modal")),

	receiptsHeader: ({ page }, use) =>
		use(page.getByRole("heading", { name: "Shared receipts" })),
	receiptsEmpty: ({ page }, use) =>
		use(page.getByText("No shared receipts yet")),
	peerReceiptPreview: ({ page }, use) =>
		use(page.getByTestId("peer-receipt-preview")),
	peerReceiptDebtStatus: ({ page }, use) =>
		use(page.getByTestId("peer-receipt-debt-status")),
});

type AllFixtures = ExtractFixture<typeof test>;

export const mockPeerReceipts = ({
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	targetPeer,
	selfPeer,
	amount = 2,
	generateReceiptBase = defaultGenerateReceiptBase,
	generateReceiptItems = defaultGenerateReceiptItems,
	generateReceiptParticipants = defaultGenerateReceiptParticipants,
	generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
	generateReceiptPayers = defaultGenerateReceiptPayers,
	generateReceipt = defaultGenerateReceipt,
	generateDebts,
	mutateReceipt = (receipt: Receipt) => receipt,
}: Pick<
	AllFixtures,
	"api" | "faker" | "fromUnitToSubunit" | "fromSubunitToUnit"
> & {
	targetPeer: ReturnType<GeneratePeers>[number];
	selfPeer: { id: Receipt["selfPeerId"] };
	amount?: number;
	generateReceiptBase?: GenerateReceiptBase;
	generateReceiptItems?: GenerateReceiptItems;
	generateReceiptParticipants?: GenerateReceiptParticipants;
	generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
	generateReceiptPayers?: GenerateReceiptPayers;
	generateReceipt?: GenerateReceipt;
	generateDebts?: GenerateDebtsFromReceipt;
	mutateReceipt?: (receipt: Receipt) => Receipt;
}) => {
	const receipts: Receipt[] = [];
	const allDebts: ReturnType<GenerateDebtsFromReceipt> = [];
	for (let index = 0; index < amount; index += 1) {
		const receiptBase = generateReceiptBase({ faker, index });
		const receiptItems = generateReceiptItems({ faker, index });
		const participants = generateReceiptParticipants({
			faker,
			selfPeerId: selfPeer.id,
			peers: [targetPeer],
			index,
		});
		const receiptPayers = generateReceiptPayers({
			faker,
			selfPeerId: selfPeer.id,
			peers: [],
			index,
		});
		const receiptItemsWithConsumers = generateReceiptItemsWithConsumers({
			faker,
			receiptItems,
			participants,
			index,
		});
		const debts = generateDebts
			? generateDebts({
					faker,
					selfPeerId: selfPeer.id,
					receiptBase,
					receiptItemsWithConsumers,
					participants,
					receiptPayers,
					fromUnitToSubunit,
					fromSubunitToUnit,
					index,
				})
			: [];
		const receipt = mutateReceipt(
			generateReceipt({
				faker,
				selfPeerId: selfPeer.id,
				receiptBase,
				receiptItemsWithConsumers,
				receiptParticipants: participants,
				receiptPayers,
				receiptDebts: debts,
				peers: [targetPeer],
				index,
			}),
		);
		allDebts.push(...debts);
		receipts.push(receipt);
	}
	api.mockFirst("receipts.getByPeerPaged", ({ input: { cursor, limit } }) => ({
		count: receipts.length,
		cursor,
		items: receipts.slice(cursor, cursor + limit).map(({ id }) => id),
	}));
	api.mockFirst("receipts.get", ({ input }) => {
		const receipt = receipts.find(
			(lookupReceipt) => lookupReceipt.id === input.id,
		);
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Expected to have receipt id "${input.id}", but none found`,
			});
		}
		return receipt;
	});
	if (allDebts.length !== 0) {
		api.mockFirst("debts.get", ({ input }) => {
			const debt = allDebts.find((lookupDebt) => lookupDebt.id === input.id);
			if (!debt) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Expected to have debt id "${input.id}", but none found`,
				});
			}
			return debt;
		});
	}
	return { receipts, debts: allDebts };
};
