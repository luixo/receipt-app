import type { Locator } from "@playwright/test";

import type { ReceiptItem, ReceiptParticipant } from "~app/trpc-types";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

import { test as base } from "../../receipt/__tests__/utils";

type SetupOptions = {
	consumers?: number;
	payers?: number;
	role?: "owner" | "editor" | "viewer";
};

type SetupResult = {
	item: ReceiptItem;
	participants: ReceiptParticipant[];
	peerIds: string[];
	peerNames: string[];
	card: Locator;
};

type Fixtures = {
	setupItem: (options?: SetupOptions) => Promise<SetupResult>;
	itemCard: (id: string) => Locator;
	itemName: (card: Locator) => Locator;
	itemPrice: (card: Locator) => Locator;
	itemPriceField: (card: Locator) => Locator;
	itemQuantity: (card: Locator) => Locator;
	itemQuantityField: (card: Locator) => Locator;
	itemPayers: (card: Locator) => Locator;
	itemConsumers: (card: Locator) => Locator;
	itemPart: (card: Locator, part: number, total: number) => Locator;
	itemMenu: (card: Locator) => Locator;
	itemPeerAvatars: (card: Locator) => Locator;
};

export const test = base.extend<Fixtures>({
	itemCard: ({ page }, use) =>
		use((id) => page.getByTestId(`receipt-item-${id}`)),
	itemName: ({}, use) =>
		use((card) => card.getByRole("textbox", { name: "Receipt item name" })),
	itemPrice: ({}, use) =>
		use((card) => card.getByRole("textbox", { name: "Receipt item price" })),
	itemPriceField: ({ itemPrice }, use) =>
		use((card) => itemPrice(card).locator("..")),
	itemQuantity: ({}, use) =>
		use((card) => card.getByRole("textbox", { name: "Receipt item quantity" })),
	itemQuantityField: ({ itemQuantity }, use) =>
		use((card) => itemQuantity(card).locator("..")),
	itemPayers: ({}, use) =>
		use((card) => card.getByRole("button", { name: /Choose a payer/ })),
	itemConsumers: ({}, use) =>
		use((card) => card.getByRole("button", { name: /Choose consumers/ })),
	itemPart: ({}, use) =>
		use((card, part, total) =>
			card.getByRole("button", { name: `${part} / ${total}` }),
		),
	itemMenu: ({}, use) =>
		use((card) => card.getByRole("button", { name: "", exact: true }).first()),
	itemPeerAvatars: ({}, use) =>
		use((card) => card.getByRole("img", { name: "avatar" })),
	setupItem: ({ api, mockReceipt, openReceipt, itemCard }, use) =>
		use(async ({ consumers = 2, payers = 0, role = "owner" } = {}) => {
			const result = await mockReceipt({
				generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 2 }),
				generateReceiptItems: (opts) =>
					defaultGenerateReceiptItems(opts)
						.slice(0, 1)
						.map((item) => ({
							...item,
							name: "Coffee beans",
							price: 12.5,
							quantity: 2,
						})),
				generateReceiptParticipants: (opts) => [
					{
						peerId: opts.selfPeerId,
						role,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					},
					...opts.peers.map((peer, index) => ({
						peerId: peer.id,
						role:
							role !== "owner" && index === 0
								? ("owner" as const)
								: ("editor" as const),
						createdAt: Temporal.Now.zonedDateTimeISO(),
					})),
				],
				generateReceipt: (opts) => {
					const receipt = defaultGenerateReceipt(opts);
					return role === "owner"
						? receipt
						: {
								...receipt,
								ownerPeerId: opts.peers[0]?.id ?? receipt.ownerPeerId,
								debts: {
									direction: "incoming" as const,
									id: undefined,
									hasMine: false as const,
									hasForeign: false as const,
								},
							};
				},
				generateReceiptItemsWithConsumers: ({ receiptItems, participants }) =>
					receiptItems.map((item) => ({
						...item,
						consumers: participants.slice(0, consumers).map((participant) => ({
							peerId: participant.peerId,
							part: 1,
							createdAt: participant.createdAt,
						})),
						payers: participants.slice(1, 1 + payers).map((participant) => ({
							peerId: participant.peerId,
							part: 1,
							createdAt: participant.createdAt,
						})),
					})),
			});
			const [item] = result.receipt.items;
			if (!item) {
				throw new Error("Expected one receipt item");
			}
			if (role !== "owner") {
				const [ownerPeer] = result.peers;
				if (!ownerPeer) {
					throw new Error("Expected an owner peer");
				}
				api.mockFirst("peers.getForeign", ({ input, next }) =>
					input.id === result.selfPeerId
						? { ...ownerPeer, id: result.selfPeerId, name: "Self" }
						: next(),
				);
			}
			await openReceipt(result.receipt);
			return {
				item,
				participants: result.participants,
				peerIds: result.participants.map(({ peerId }) => peerId),
				peerNames: result.peers.map(({ name }) => name),
				card: itemCard(item.id),
			};
		}),
});
