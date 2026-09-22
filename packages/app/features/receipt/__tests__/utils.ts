import type { Peer } from "~app/trpc-types";
import type { PeerId, ReceiptId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import { defaultGenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
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

type Fixtures = {
	mockBase: () => Promise<{
		selfPeer: Peer;
	}>;
	mockReceipt: (options?: {
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generatePeers?: GeneratePeers;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
		generateReceiptPayers?: GenerateReceiptPayers;
		generateReceipt?: GenerateReceipt;
		generateDebts?: GenerateDebtsFromReceipt;
	}) => Promise<{
		receiptBase: ReturnType<GenerateReceiptBase>;
		receipt: ReturnType<GenerateReceipt>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		receiptPayers: ReturnType<GenerateReceiptPayers>;
		peers: ReturnType<GeneratePeers>;
		receiptDebts: ReturnType<GenerateDebtsFromReceipt>;
		selfPeerId: PeerId;
	}>;
	openReceipt: (
		receipt: { id: ReceiptId; ownerPeerId: PeerId },
		options?: { awaitCache?: boolean },
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(async () => {
			const { peer } = await api.mockUtils.authPage();
			api.mockFirst("currency.top", { items: [] });
			api.mockFirst("peers.suggest", { cursor: 0, count: 0, items: [] });
			api.mockFirst("peers.suggestTop", { items: [] });
			return { selfPeer: peer };
		}),
	mockReceipt: (
		{ api, faker, mockBase, fromUnitToSubunit, fromSubunitToUnit },
		use,
	) =>
		use(
			async ({
				generateReceiptBase = defaultGenerateReceiptBase,
				generatePeers = defaultGeneratePeers,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
				generateReceiptPayers = defaultGenerateReceiptPayers,
				generateReceipt = defaultGenerateReceipt,
				generateDebts = defaultGenerateDebtsFromReceipt,
			} = {}) => {
				const { selfPeer } = await mockBase();
				const peers = generatePeers({ faker });
				const receiptBase = generateReceiptBase({ faker });
				const receiptItems = generateReceiptItems({ faker });
				const participants = generateReceiptParticipants({
					faker,
					selfPeerId: selfPeer.id,
					peers,
				});
				const receiptPayers = generateReceiptPayers({
					faker,
					selfPeerId: selfPeer.id,
					peers: [],
				});
				const receiptItemsWithConsumers = generateReceiptItemsWithConsumers({
					faker,
					receiptItems,
					participants,
				});
				const debts = generateDebts({
					faker,
					selfPeerId: selfPeer.id,
					receiptBase,
					receiptItemsWithConsumers,
					participants,
					receiptPayers,
					fromUnitToSubunit,
					fromSubunitToUnit,
				});
				const receipt = generateReceipt({
					faker,
					selfPeerId: selfPeer.id,
					receiptBase,
					receiptParticipants: participants,
					receiptItemsWithConsumers,
					receiptPayers,
					peers,
					receiptDebts: debts,
				});
				api.mockFirst("receipts.get", ({ input }) => {
					if (input.id !== receiptBase.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				api.mockFirst(
					"peers.get",
					({ input, next }) =>
						peers.find((peer) => peer.id === input.id) || next(),
				);
				api.mockFirst(
					"debts.get",
					({ input, next }) =>
						debts.find((debt) => debt.id === input.id) || next(),
				);
				api.mockFirst(
					"peers.getForeign",
					({ input, next }) =>
						peers.find((peer) => peer.id === input.id) || next(),
				);

				return {
					receiptBase,
					receipt,
					participants,
					receiptItemsWithConsumers,
					receiptPayers,
					receiptDebts: debts,
					peers,
					selfPeerId: selfPeer.id,
				};
			},
		),

	openReceipt: ({ page, awaitCacheKey }, use) =>
		use(async (receipt, { awaitCache = true } = {}) => {
			await page.navigate({ to: "/receipts/$id", params: { id: receipt.id } });
			if (awaitCache) {
				await awaitCacheKey("peers.get", {
					input: { id: receipt.ownerPeerId },
				});
			}
		}),
});
