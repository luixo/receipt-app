import type { Locator } from "@playwright/test";
import assert from "node:assert";

import { test as base } from "~app/features/receipt/__tests__/utils";
import type { Receipt, ReceiptItem, ReceiptParticipant } from "~app/trpc-types";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItems,
} from "~tests/frontend/generators/receipts";

type SetupOptions = {
	consumers?: number;
	payers?: number;
	role?: "owner" | "editor" | "viewer";
};

type MockResult = {
	receipt: Receipt;
	item: ReceiptItem;
	participants: ReceiptParticipant[];
	peerIds: string[];
	peerNames: string[];
};

type Fixtures = {
	mockItem: (options?: SetupOptions) => Promise<MockResult>;
	card: Locator;
	itemName: Locator;
	itemPrice: Locator;
	itemPriceField: Locator;
	itemQuantity: Locator;
	itemQuantityField: Locator;
	itemPayers: Locator;
	itemConsumers: Locator;
	itemPart: (part: number, total: number) => Locator;
	itemMenu: Locator;
};

export const test = base.extend<Fixtures>({
	card: ({ page }, use) => use(page.getByTestId("receipt-item")),
	itemName: ({ card }, use) =>
		use(card.getByRole("textbox", { name: "Receipt item name" })),
	itemPrice: ({ card }, use) =>
		use(card.getByRole("textbox", { name: "Receipt item price" })),
	itemPriceField: ({ card, page }, use) =>
		use(
			card.getByRole("group").filter({
				has: page.getByRole("textbox", { name: "Receipt item price" }),
			}),
		),
	itemQuantity: ({ card }, use) =>
		use(card.getByRole("textbox", { name: "Receipt item quantity" })),
	itemQuantityField: ({ card, page }, use) =>
		use(
			card.getByRole("group").filter({
				has: page.getByRole("textbox", { name: "Receipt item quantity" }),
			}),
		),
	itemPayers: ({ card }, use) =>
		use(card.getByRole("button", { name: "Choose a payer" })),
	itemConsumers: ({ card }, use) =>
		use(card.getByRole("button", { name: "Choose consumers" })),
	itemPart: ({ card }, use) =>
		use((part, total) =>
			card.getByRole("button", { name: `${part} / ${total}` }),
		),
	itemMenu: ({ card, icon }, use) =>
		use(card.getByRole("button").filter({ has: icon("ellipsis") })),
	mockItem: ({ api, mockReceipt }, use) =>
		use(async ({ consumers = 2, payers = 0, role = "owner" } = {}) => {
			let ownerPeerId: string | undefined = undefined;
			const result = await mockReceipt({
				generatePeers: (opts) => {
					const peers = defaultGeneratePeers({ ...opts, amount: 2 });
					ownerPeerId = role === "owner" ? undefined : peers[0]?.id;
					return peers;
				},
				generateReceiptItems: (opts) =>
					defaultGenerateReceiptItems(opts)
						.slice(0, 1)
						.map((item) => ({
							...item,
							name: opts.faker.commerce.productName(),
							price: opts.faker.number.float({
								min: 10,
								max: 20,
								fractionDigits: 2,
							}),
							quantity: opts.faker.number.int({ min: 2, max: 4 }),
						})),
				generateReceiptParticipants: (opts) => {
					const receipt = { ownerPeerId: ownerPeerId ?? opts.selfPeerId };
					return [
						{
							peerId: opts.selfPeerId,
							role:
								receipt.ownerPeerId === opts.selfPeerId
									? ("owner" as const)
									: role,
							createdAt: Temporal.Now.zonedDateTimeISO(),
						},
						...opts.peers.map((peer) => ({
							peerId: peer.id,
							role:
								peer.id === receipt.ownerPeerId
									? ("owner" as const)
									: ("editor" as const),
							createdAt: Temporal.Now.zonedDateTimeISO(),
						})),
					];
				},
				generateReceipt: (opts) => {
					const receipt = defaultGenerateReceipt(opts);
					return role === "owner"
						? receipt
						: {
								...receipt,
								ownerPeerId: ownerPeerId ?? receipt.ownerPeerId,
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
			assert.ok(item);
			if (role !== "owner") {
				const [ownerPeer] = result.peers;
				assert.ok(ownerPeer);
				api.mockFirst("peers.getForeign", ({ input, next }) =>
					input.id === result.selfPeerId
						? { ...ownerPeer, id: result.selfPeerId, name: "Self" }
						: next(),
				);
			}
			return {
				receipt: result.receipt,
				item,
				participants: result.participants,
				peerIds: result.participants.map(({ peerId }) => peerId),
				peerNames: result.peers.map(({ name }) => name),
			};
		}),
});
