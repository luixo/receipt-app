import type { ReceiptsId, UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateSelfAccount } from "~tests/frontend/generators/accounts";
import { defaultGenerateSelfAccount } from "~tests/frontend/generators/accounts";
import type {
	GenerateReceipt,
	GenerateReceiptBase,
	GenerateReceiptItems,
	GenerateReceiptItemsWithConsumers,
	GenerateReceiptParticipants,
} from "~tests/frontend/generators/receipts";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptItems,
	defaultGenerateReceiptItemsWithConsumers,
	defaultGenerateReceiptParticipants,
} from "~tests/frontend/generators/receipts";
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => void;
	mockReceipt: (options?: {
		generateSelfAccount?: GenerateSelfAccount;
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generateUsers?: GenerateUsers;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
		generateReceipt?: GenerateReceipt;
	}) => {
		selfAccount: ReturnType<GenerateSelfAccount>;
		receiptBase: ReturnType<GenerateReceiptBase>;
		receipt: ReturnType<GenerateReceipt>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		users: ReturnType<GenerateUsers>;
	};
	openReceipt: (id: ReceiptsId) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(() => {
			api.mockUtils.currencyList();
			api.mockFirst("currency.top", []);
			api.mockFirst("users.suggest", { cursor: 0, hasMore: false, items: [] });
			api.mockFirst("users.suggestTop", { items: [] });
		}),
	mockReceipt: ({ api, faker, mockBase }, use) =>
		use(
			({
				generateSelfAccount = defaultGenerateSelfAccount,
				generateReceiptBase = defaultGenerateReceiptBase,
				generateUsers = defaultGenerateUsers,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
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
				const receiptItemsWithConsumers = generateReceiptItemsWithConsumers({
					faker,
					receiptItems,
					participants,
				});
				const receipt = generateReceipt({
					faker,
					selfAccount,
					receiptBase,
					receiptParticipants: participants,
					receiptItemsWithConsumers,
					users,
				});
				api.mockFirst("receipts.get", ({ input }) => {
					if (input.id !== receiptBase.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return receipt;
				});
				const usersFn = ({ input }: { input: { id: UsersId } }) => {
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
				api.mockFirst("users.get", usersFn);
				api.mockFirst("users.getForeign", usersFn);
				api.mockUtils.authPage();
				api.mockFirst("account.get", {
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
					receiptItemsWithConsumers,
					users,
				};
			},
		),

	openReceipt: ({ page, awaitCacheKey }, use) =>
		use(async (receiptId) => {
			await page.goto(`/receipts/${receiptId}`);
			await awaitCacheKey("currency.top");
			await awaitCacheKey("users.get");
		}),
});
