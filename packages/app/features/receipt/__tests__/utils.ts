import type { ReceiptsId, UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";

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
		users: ReturnType<GenerateUsers>;
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
					receiptParticipants: participants,
					receiptItemsParts,
					users,
				});
				api.mock("receipts.get", (input) => {
					if (input.id !== receiptBase.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				const usersFn = (input: { id: UsersId }) => {
					if (input.id === selfAccount.accountId) {
						return {
							id: selfAccount.userId,
							name: selfAccount.name,
							publicName: undefined,
							connectedAccount: {
								id: selfAccount.accountId,
								email: selfAccount.email,
								avatarUrl: selfAccount.avatarUrl,
							},
						};
					}
					const matchedUser = users.find((user) => user.id === input.id);
					if (matchedUser) {
						return {
							id: matchedUser.id,
							name: matchedUser.name,
							publicName: undefined,
							connectedAccount: matchedUser.connectedAccount
								? {
										id: matchedUser.connectedAccount.id,
										email: matchedUser.connectedAccount.email,
										avatarUrl: matchedUser.connectedAccount.avatarUrl,
								  }
								: undefined,
						};
					}

					throw new Error(
						`Unexpected user id in "users.get" / "users.getForeign": ${input.id}`,
					);
				};
				api.mock("users.get", usersFn);
				api.mock("users.getForeign", usersFn);
				api.mockUtils.auth({
					account: {
						id: selfAccount.accountId,
						email: selfAccount.email,
						verified: true,
						avatarUrl: selfAccount.avatarUrl,
						role: undefined,
					},
					user: { name: selfAccount.name },
				});

				return {
					selfAccount,
					receiptBase,
					receipt,
					participants,
					receiptItemsParts,
					users,
				};
			},
		),

	openReceipt: ({ page, awaitCacheKey }, use) =>
		use(async (receiptId) => {
			await page.goto(`/receipts/${receiptId}`);
			await awaitCacheKey(["currency.topReceipts", "users.get"]);
		}),
});
