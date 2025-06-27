import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId, UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
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
import type { GenerateUsers } from "~tests/frontend/generators/users";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => {
		selfUser: TRPCQueryOutput<"users.get">;
	};
	mockReceipt: (options?: {
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generateUsers?: GenerateUsers;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
		generateReceiptPayers?: GenerateReceiptPayers;
		generateReceipt?: GenerateReceipt;
	}) => {
		receiptBase: ReturnType<GenerateReceiptBase>;
		receipt: ReturnType<GenerateReceipt>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		receiptPayers: ReturnType<GenerateReceiptPayers>;
		users: ReturnType<GenerateUsers>;
		selfUserId: UsersId;
	};
	openReceipt: (id: ReceiptsId) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(() => {
			const { user } = api.mockUtils.authPage();
			api.mockFirst("currency.top", []);
			api.mockFirst("users.suggest", { cursor: 0, count: 0, items: [] });
			api.mockFirst("users.suggestTop", { items: [] });
			return { selfUser: user };
		}),
	mockReceipt: ({ api, faker, mockBase }, use) =>
		use(
			({
				generateReceiptBase = defaultGenerateReceiptBase,
				generateUsers = defaultGenerateUsers,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
				generateReceiptPayers = defaultGenerateReceiptPayers,
				generateReceipt = defaultGenerateReceipt,
			} = {}) => {
				const { selfUser } = mockBase();
				const users = generateUsers({ faker });
				const receiptBase = generateReceiptBase({ faker });
				const receiptItems = generateReceiptItems({ faker });
				const participants = generateReceiptParticipants({
					faker,
					selfUserId: selfUser.id,
					users,
				});
				const receiptPayers = generateReceiptPayers({
					faker,
					selfUserId: selfUser.id,
					users: [],
				});
				const receiptItemsWithConsumers = generateReceiptItemsWithConsumers({
					faker,
					receiptItems,
					participants,
				});
				const receipt = generateReceipt({
					faker,
					selfUserId: selfUser.id,
					receiptBase,
					receiptParticipants: participants,
					receiptItemsWithConsumers,
					receiptPayers,
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
				api.mockFirst(
					"users.get",
					({ input, next }) =>
						users.find((user) => user.id === input.id) || next(),
				);
				api.mockFirst(
					"users.getForeign",
					({ input, next }) =>
						users.find((user) => user.id === input.id) || next(),
				);

				return {
					receiptBase,
					receipt,
					participants,
					receiptItemsWithConsumers,
					receiptPayers,
					users,
					selfUserId: selfUser.id,
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
