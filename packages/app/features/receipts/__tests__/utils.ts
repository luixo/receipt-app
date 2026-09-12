import { TRPCError } from "@trpc/server";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";
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
import type { ExtractFixture } from "~tests/frontend/types";

export type { ReceiptId } from "~db/ids";

type Receipt = TRPCQueryOutput<"receipts.get">;

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
		generateUsers?: GenerateUsers;
		generateReceiptBase?: GenerateReceiptBase;
		generateReceiptItems?: GenerateReceiptItems;
		generateReceiptParticipants?: GenerateReceiptParticipants;
		generateReceiptItemsWithConsumers?: GenerateReceiptItemsWithConsumers;
		generateReceiptPayers?: GenerateReceiptPayers;
		generateReceipt?: GenerateReceipt;
		generateDebts?: GenerateDebtsFromReceipt;
	}) => Promise<{
		receipts: Receipt[];
		users: ReturnType<GenerateUsers>;
		selfUserId: Receipt["selfUserId"];
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
				generateUsers = defaultGenerateUsers,
				generateReceiptBase = defaultGenerateReceiptBase,
				generateReceiptItems = defaultGenerateReceiptItems,
				generateReceiptParticipants = defaultGenerateReceiptParticipants,
				generateReceiptItemsWithConsumers = defaultGenerateReceiptItemsWithConsumers,
				generateReceiptPayers = defaultGenerateReceiptPayers,
				generateReceipt = defaultGenerateReceipt,
				generateDebts,
			} = {}) => {
				const { user: selfUser } = await mockBase();
				const users = generateUsers({ faker, index: 0 });
				api.mockUtils.mockUsers(...users);
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
						selfUserId: selfUser.id,
						users,
						index,
					});
					const receiptPayers = generateReceiptPayers({
						faker,
						selfUserId: selfUser.id,
						users: [],
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
								selfUserId: selfUser.id,
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
						selfUserId: selfUser.id,
						receiptBase,
						receiptParticipants: participants,
						receiptItemsWithConsumers,
						receiptPayers,
						receiptDebts: debts,
						users,
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
								(receipt) => receipt.ownerUserId === selfUser.id,
							);
						}
						if (filters.ownedByMe === false) {
							filtered = filtered.filter(
								(receipt) => receipt.ownerUserId !== selfUser.id,
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
					"users.get",
					({ input, next }) =>
						users.find((user) => user.id === input.id) || next(),
				);
				api.mockFirst(
					"users.getForeign",
					({ input, next }) =>
						users.find((user) => user.id === input.id) || next(),
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
					users,
					selfUserId: selfUser.id,
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
