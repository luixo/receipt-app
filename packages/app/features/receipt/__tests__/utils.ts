import { test as originalTest } from "@tests/frontend/fixtures";
import type { ReceiptsId } from "next-app/db/models";

import type {
	GenerateReceipt,
	GenerateReceiptBase,
	GenerateReceiptItems,
	GenerateReceiptItemsParts,
	GenerateReceiptParticipants,
	GenerateSelfAccount,
	GenerateUsers,
} from "./generators";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptItems,
	defaultGenerateReceiptItemsParts,
	defaultGenerateReceiptParticipants,
	defaultGenerateSelfAccount,
	defaultGenerateUsers,
} from "./generators";

type Fixtures = {
	mockBase: () => void;
	mockReceipt: (options?: {
		generateSelfAccount?: GenerateSelfAccount;
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generateUsers?: GenerateUsers;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsParts?: GenerateReceiptItemsParts;
		generateReceipt?: GenerateReceipt;
	}) => {
		selfAccount: ReturnType<GenerateSelfAccount>;
		receiptBase: ReturnType<GenerateReceiptBase>;
		receipt: ReturnType<GenerateReceipt>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptItemsParts: ReturnType<GenerateReceiptItemsParts>;
	};
	openReceipt: (id: ReceiptsId) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(() => {
			api.mockUtils.currencyList();
			api.mock("currency.topReceipts", []);
			api.mock("users.suggest", { cursor: 0, hasMore: false, items: [] });
			api.mock("users.suggestTop", { items: [] });
		}),
	mockReceipt: ({ api, faker, mockBase }, use) =>
		use(
			({
				generateSelfAccount = defaultGenerateSelfAccount,
				generateReceiptBase = defaultGenerateReceiptBase,
				generateUsers = defaultGenerateUsers,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsParts = defaultGenerateReceiptItemsParts,
				generateReceipt = defaultGenerateReceipt,
			} = {}) => {
				mockBase();
				const selfAccount = generateSelfAccount({ faker });
				const users = generateUsers({ faker });
				const receiptBase = generateReceiptBase({ faker, selfAccount });
				const receiptItems = generateReceiptItems({ faker, selfAccount });
				const participants = generateReceiptParticipants({
					faker,
					selfAccount,
					users,
				});
				const receiptItemsParts = generateReceiptItemsParts({
					faker,
					receiptItems,
					participants,
				});
				const receipt = generateReceipt({
					faker,
					selfAccount,
					receiptBase,
					receiptItemsParts,
				});
				api.mock("receipts.get", (input) => {
					if (input.id !== receiptBase.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				api.mock("receiptItems.get", (input) => {
					if (input.receiptId !== receiptBase.id) {
						throw new Error(
							`Unexpected receipt id in "receiptItems.get": ${input.receiptId}`,
						);
					}
					return {
						role: "owner",
						items: receiptItemsParts,
						participants,
					};
				});
				api.mock("users.get", (input) => {
					if (input.id === selfAccount.accountId) {
						return {
							remoteId: selfAccount.userId,
							name: selfAccount.name,
							publicName: undefined,
							connectedAccount: {
								id: selfAccount.accountId,
								email: selfAccount.email,
								avatarUrl: selfAccount.avatarUrl,
							},
							localId: selfAccount.userId,
						};
					}
					const matchedUser = users.find((user) => user.id === input.id);
					if (matchedUser) {
						return {
							remoteId: matchedUser.id,
							name: matchedUser.name,
							publicName: undefined,
							connectedAccount: undefined,
							localId: matchedUser.id,
						};
					}

					throw new Error(`Unexpected user id in "users.get": ${input.id}`);
				});
				api.mockUtils.auth({
					account: {
						id: selfAccount.accountId,
						verified: true,
						avatarUrl: selfAccount.avatarUrl,
					},
					user: { name: selfAccount.name },
				});

				return {
					selfAccount,
					receiptBase,
					receipt,
					participants,
					receiptItemsParts,
				};
			},
		),

	openReceipt: ({ page, awaitCacheKey }, use) =>
		use(async (receiptId) => {
			await page.goto(`/receipts/${receiptId}`);
			await awaitCacheKey(["currency.topReceipts", "users.get"]);
		}),
});
