import { faker } from "@faker-js/faker";
import type { Locator } from "@playwright/test";

import { test as originalTest } from "@tests/frontend/fixtures";
import type { TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { getParticipantSums } from "app/utils/receipt-item";
import { id, nonNullishGuard } from "app/utils/utils";
import type { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";
import { CURRENCY_CODES } from "next-app/utils/currency";

export const getRandomCurrencyCode = () =>
	faker.helpers.arrayElement(CURRENCY_CODES);

const getFakeDebtNote = (receiptName: string) =>
	`Fake receipt "${receiptName}"`;

type MockReceiptResult = {
	receipt: {
		id: ReceiptsId;
		name: string;
	};
	account: {
		id: AccountsId;
		email: string;
		avatarUrl: string | undefined;
	};
	selfUser: {
		id: UsersId;
		name: string;
	};
};

export type ModifyOutcomingDebts = (
	debts: TRPCQueryOutput<"debts.get">[],
	opts: {
		participants: TRPCQueryOutput<"receiptItems.get">["participants"];
		consts: MockReceiptResult;
	},
) => TRPCQueryOutput<"debts.get">[];

export type ModifyReceiptItems = (
	items: TRPCQueryOutput<"receiptItems.get">["items"],
	opts: {
		participants: TRPCQueryOutput<"receiptItems.get">["participants"];
		consts: MockReceiptResult;
	},
) => TRPCQueryOutput<"receiptItems.get">["items"];

type MockReceiptOptions = {
	modifyOutcomingDebts?: ModifyOutcomingDebts;
	modifyReceiptItems?: ModifyReceiptItems;
	currencyCode?: CurrencyCode;
	issued?: Date;
	sum?: number;
	lockedTimestamp?: Date;
};

type Fixtures = {
	mockReceipt: (options?: MockReceiptOptions) => Promise<MockReceiptResult>;
	sendDebtButton: Locator;
	updateDebtButton: Locator;
	propagateDebtsButton: Locator;
	openDebtsInfoPanel: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockReceipt: ({ api }, use) =>
		use(
			async ({
				modifyOutcomingDebts = id,
				modifyReceiptItems = id,
				currencyCode = getRandomCurrencyCode(),
				issued = new Date(),
				sum = Number(faker.finance.amount()),
				lockedTimestamp,
			} = {}) => {
				const accountId = faker.string.uuid();
				const consts: MockReceiptResult = {
					receipt: {
						id: faker.string.uuid(),
						name: faker.lorem.words(),
					},
					account: {
						id: accountId,
						email: faker.internet.email(),
						avatarUrl: undefined,
					},
					selfUser: {
						id: accountId as UsersId,
						name: "Me",
					},
				};

				const receiptItems = Array.from(
					{ length: faker.number.int({ min: 3, max: 8 }) },
					() => ({
						id: faker.string.uuid(),
						price: Number(faker.finance.amount()),
						quantity: faker.number.int({ max: 100 }),
						name: faker.commerce.productName(),
					}),
				);
				const users = Array.from(
					{ length: faker.number.int({ min: 2, max: 6 }) },
					() => ({
						id: faker.string.uuid(),
						name: faker.person.fullName(),
					}),
				);
				const participants = [
					{
						remoteUserId: consts.account.id as UsersId,
						publicName: null,
						connectedAccount: {
							id: consts.account.id,
							email: consts.account.email,
							avatarUrl: consts.account.avatarUrl,
						},
						role: "owner" as const,
						resolved: false,
						added: faker.date.recent({ days: 5, refDate: new Date() }),
						name: consts.selfUser.name,
					},
					...users.map((user) => ({
						remoteUserId: user.id,
						publicName: null,
						connectedAccount: undefined,
						role: "editor" as const,
						resolved: faker.datatype.boolean(),
						added: faker.date.recent({ days: 5, refDate: new Date() }),
						name: user.name,
					})),
				];
				const participatedItems = modifyReceiptItems(
					receiptItems.map((item) => ({
						id: item.id,
						price: item.price,
						quantity: item.quantity,
						locked: false,
						name: item.name,
						parts: faker.helpers.arrayElements(
							participants.map((participant) => ({
								userId: participant.remoteUserId,
								part: faker.number.int({ min: 1, max: 3 }),
							})),
						),
					})),
					{ participants, consts },
				);
				const participantSums = getParticipantSums(
					consts.receipt.id,
					participatedItems,
					participants,
				);
				const debts = modifyOutcomingDebts(
					participantSums
						.map((participantSum) => {
							const debtLockedTimestamp = faker.date.recent({
								days: 1,
								refDate: new Date(),
							});
							if (participantSum.remoteUserId === consts.selfUser.id) {
								return null;
							}
							if (participantSum.sum === 0) {
								return null;
							}
							return {
								id: faker.string.uuid(),
								currencyCode,
								receiptId: consts.receipt.id,
								userId: participantSum.remoteUserId,
								timestamp: issued,
								note: getFakeDebtNote(consts.receipt.name),
								amount: participantSum.sum,
								lockedTimestamp: debtLockedTimestamp,
								their: faker.datatype.boolean()
									? {
											lockedTimestamp: faker.datatype.boolean()
												? debtLockedTimestamp
												: faker.datatype.boolean()
												? faker.date.recent({ days: 1, refDate: new Date() })
												: undefined,
											currencyCode,
											timestamp: issued,
											amount: participantSum.sum,
									  }
									: undefined,
							};
						})
						.filter(nonNullishGuard),
					{ participants, consts },
				);

				api.mockUtils.currencyList();
				api.mock("currency.topReceipts", []);
				api.mock("users.suggest", { cursor: 0, hasMore: false, items: [] });
				api.mock("users.suggestTop", { items: [] });
				api.mock("receipts.get", (input) => {
					if (input.id !== consts.receipt.id) {
						throw new Error(
							`Unexpected receipt id in "receipts.get": ${input.id}`,
						);
					}
					return {
						id: input.id,
						name: consts.receipt.name,
						currencyCode,
						issued,
						participantResolved: false,
						ownerUserId: consts.selfUser.id,
						selfUserId: consts.selfUser.id,
						sum,
						role: "owner",
						lockedTimestamp,
						debt: lockedTimestamp
							? {
									direction: "outcoming",
									ids: debts.map((debt) => debt.id),
							  }
							: undefined,
					};
				});
				api.mock("receiptItems.get", (input) => {
					if (input.receiptId !== consts.receipt.id) {
						throw new Error(
							`Unexpected receipt id in "receiptItems.get": ${input.receiptId}`,
						);
					}
					return {
						role: "owner",
						items: participatedItems,
						participants,
					};
				});
				api.mock("users.get", (input) => {
					if (input.id === consts.account.id) {
						return {
							remoteId: consts.selfUser.id,
							name: consts.selfUser.name,
							publicName: undefined,
							connectedAccount: {
								id: consts.account.id,
								email: consts.account.email,
								avatarUrl: consts.account.avatarUrl,
							},
							localId: consts.selfUser.id,
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
				if (debts.length !== 0) {
					api.mock("debts.get", (input) => {
						const outcomingDebt = debts.find((debt) => debt.id === input.id);
						if (!outcomingDebt) {
							throw new Error(`Unexpected user id in "debts.get": ${input.id}`);
						}
						return outcomingDebt;
					});
				}
				api.mockUtils.auth({
					account: {
						id: consts.account.id,
						verified: true,
						avatarUrl: consts.account.avatarUrl,
					},
					user: { name: consts.selfUser.name },
				});

				return consts;
			},
		),

	updateDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Update debt for user']")),

	sendDebtButton: ({ page }, use) =>
		use(page.locator("button[title='Send debt to a user']")),

	propagateDebtsButton: ({ page }, use) =>
		use(page.locator("button[title='Propagate debts']")),

	openDebtsInfoPanel: ({ page, modal }, use) =>
		use(async () => {
			await page.locator("button[title='Show sync status']").click();
			await modal("Receipt sync status").waitFor();
		}),
});
