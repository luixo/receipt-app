import { TRPCError } from "@trpc/server";

import type { Receipt } from "~app/trpc-types";
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

export type { ReceiptId } from "~db/ids";

type Fixtures = {
	mockBase: () => Promise<
		Awaited<
			ReturnType<
				ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
			>
		>
	>;
	mockReceipts: (options?: {
		amount?: number;
		generatePeers?: GeneratePeers;
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
		generateReceiptPayers?: GenerateReceiptPayers;
		generateReceipt?: GenerateReceipt;
		generateDebts?: GenerateDebtsFromReceipt;
	}) => Promise<{
		receipts: Receipt[];
		peers: ReturnType<GeneratePeers>;
		selfPeerId: Receipt["selfPeerId"];
		debts: ReturnType<GenerateDebtsFromReceipt>;
	}>;
	openReceiptsScreen: (options?: {
		awaitCache?: boolean;
		awaitReceipts?: number;
	}) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			api.mockFirst("currency.top", { items: [] });
			return auth;
		}),

	mockReceipts: (
		{ api, faker, mockBase, fromUnitToSubunit, fromSubunitToUnit },
		use,
	) =>
		use(
			async ({
				amount = 3,
				generatePeers = defaultGeneratePeers,
				generateReceiptBase = defaultGenerateReceiptBase,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
				generateReceiptPayers = defaultGenerateReceiptPayers,
				generateReceipt = defaultGenerateReceipt,
				generateDebts,
			} = {}) => {
				const { peer: selfPeer } = await mockBase();
				const peers = generatePeers({ faker, index: 0 });
				api.mockUtils.mockPeers(...peers);
				const receipts: Receipt[] = [];
				const allDebts: ReturnType<GenerateDebtsFromReceipt> = [];
				for (let index = 0; index < amount; index += 1) {
					const receiptBase = generateReceiptBase({ faker, index });
					const receiptItems = generateReceiptItems({
						faker,
						index,
					});
					const participants = generateReceiptParticipants({
						faker,
						selfPeerId: selfPeer.id,
						peers,
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
					const receipt: ReturnType<typeof generateReceipt> = generateReceipt({
						faker,
						selfPeerId: selfPeer.id,
						receiptBase,
						receiptParticipants: participants,
						receiptItemsWithConsumers,
						receiptPayers,
						receiptDebts: debts,
						peers,
						index,
					});
					allDebts.push(...debts);
					receipts.push(receipt);
				}
				api.mockFirst(
					"receipts.getPaged",
					({ input: { cursor, limit, filters = {} } }) => {
						let filtered = receipts;
						if (filters.ownedByMe === true) {
							filtered = filtered.filter(
								(receipt) => receipt.ownerPeerId === selfPeer.id,
							);
						}
						if (filters.ownedByMe === false) {
							filtered = filtered.filter(
								(receipt) => receipt.ownerPeerId !== selfPeer.id,
							);
						}
						if (filters.query) {
							const query = filters.query.toLowerCase();
							filtered = filtered.filter((receipt) =>
								receipt.name.toLowerCase().includes(query),
							);
						}
						return {
							count: filtered.length,
							cursor,
							items: filtered.slice(cursor, cursor + limit).map((receipt) => ({
								id: receipt.id,
								highlights: [],
								matchedItems: [],
							})),
						};
					},
				);
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
				api.mockFirst(
					"peers.get",
					({ input, next }) =>
						peers.find((peer) => peer.id === input.id) || next(),
				);
				api.mockFirst(
					"peers.getForeign",
					({ input, next }) =>
						peers.find((peer) => peer.id === input.id) || next(),
				);
				if (allDebts.length !== 0) {
					api.mockFirst("debts.get", ({ input }) => {
						const debt = allDebts.find(
							(lookupDebt) => lookupDebt.id === input.id,
						);
						if (!debt) {
							throw new TRPCError({
								code: "NOT_FOUND",
								message: `Expected to have debt id "${input.id}", but none found`,
							});
						}
						return debt;
					});
				}
				return {
					receipts,
					peers,
					selfPeerId: selfPeer.id,
					debts: allDebts,
				};
			},
		),

	openReceiptsScreen: ({ page, awaitCacheKey }, use) =>
		use(async ({ awaitCache = true, awaitReceipts } = {}) => {
			await page.navigate({ to: "/receipts" });
			if (awaitCache) {
				await awaitCacheKey("receipts.getPaged");
			}
			if (awaitReceipts) {
				await awaitCacheKey("receipts.get", awaitReceipts);
			}
		}),
});
