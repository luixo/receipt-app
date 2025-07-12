import { isNonNullish } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";
import type { Temporal } from "~utils/date";
import { getNow, subtract } from "~utils/date";

import type { GenerateUsers } from "./users";
import type { GeneratorFnWithFaker } from "./utils";
import { generateCurrencyCode } from "./utils";

export type GenerateReceiptBase = GeneratorFnWithFaker<{
	id: ReceiptsId;
	name: string;
	currencyCode: CurrencyCode;
	issued: Temporal.PlainDate;
}>;

export const defaultGenerateReceiptBase: GenerateReceiptBase = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.lorem.words(),
	currencyCode: generateCurrencyCode(faker),
	issued: getNow.plainDate(),
	role: "owner",
});

export type GenerateReceiptItems = GeneratorFnWithFaker<
	{
		id: ReceiptItemsId;
		price: number;
		quantity: number;
		name: string;
		createdAt: Temporal.ZonedDateTime;
	}[]
>;

export const defaultGenerateReceiptItems: GenerateReceiptItems = ({ faker }) =>
	Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
		id: faker.string.uuid(),
		price: Number(faker.finance.amount()),
		quantity: faker.number.int({ max: 100 }),
		name: faker.commerce.productName(),
		createdAt: faker.temporal.between.zonedDateTime({
			from: subtract.zonedDateTime(getNow.zonedDateTime(), { months: 1 }),
			to: getNow.zonedDateTime(),
		}),
	}));

export type GenerateReceiptParticipants = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">["participants"],
	{
		selfUserId: UsersId;
		users: ReturnType<GenerateUsers>;
		addSelf?: boolean;
	}
>;

export const defaultGenerateReceiptParticipants: GenerateReceiptParticipants =
	({ faker, users, selfUserId, addSelf = true }) =>
		[
			...users.map((user) => ({
				userId: user.id,
				role: "editor" as const,
				createdAt: faker.temporal.recent.zonedDateTime({
					days: 5,
					refDate: getNow.zonedDateTime(),
				}),
			})),
			addSelf
				? {
						userId: selfUserId,
						role: "owner" as const,
						createdAt: faker.temporal.recent.zonedDateTime({
							days: 5,
							refDate: getNow.zonedDateTime(),
						}),
					}
				: undefined,
		].filter(isNonNullish);

export type GenerateReceiptPayers = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">["payers"],
	{
		selfUserId: UsersId;
		users: ReturnType<GenerateUsers>;
		addSelf?: boolean;
	}
>;

export const defaultGenerateReceiptPayers: GenerateReceiptPayers = ({
	faker,
	users,
	selfUserId,
	addSelf = false,
}) =>
	[
		...users.map((user) => ({
			userId: user.id,
			part: 1,
			createdAt: faker.temporal.recent.zonedDateTime({
				days: 5,
				refDate: getNow.zonedDateTime(),
			}),
		})),
		addSelf
			? {
					userId: selfUserId,
					part: 1,
					createdAt: faker.temporal.recent.zonedDateTime({
						days: 5,
						refDate: getNow.zonedDateTime(),
					}),
				}
			: undefined,
	].filter(isNonNullish);

export type GenerateReceiptItemsWithConsumers = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">["items"],
	{
		receiptItems: ReturnType<GenerateReceiptItems>;
		participants: ReturnType<GenerateReceiptParticipants>;
	}
>;

export const defaultGenerateReceiptItemsWithConsumers: GenerateReceiptItemsWithConsumers =
	({ faker, receiptItems, participants }) =>
		receiptItems.map((item) => ({
			id: item.id,
			price: item.price,
			quantity: item.quantity,
			name: item.name,
			createdAt: item.createdAt,
			consumers: participants.map((participant) => ({
				createdAt: faker.temporal.between.zonedDateTime({
					from: item.createdAt,
					to: getNow.zonedDateTime(),
				}),
				userId: participant.userId,
				part: faker.number.int({ min: 1, max: 3 }),
			})),
		}));

export type GenerateReceipt = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">,
	{
		selfUserId: UsersId;
		receiptBase: ReturnType<GenerateReceiptBase>;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		receiptParticipants: ReturnType<GenerateReceiptParticipants>;
		receiptPayers: ReturnType<GenerateReceiptPayers>;
		users: ReturnType<GenerateUsers>;
	}
>;

export const defaultGenerateReceipt: GenerateReceipt = ({
	selfUserId,
	receiptBase,
	receiptItemsWithConsumers: receiptItemsConsumers,
	receiptParticipants,
	receiptPayers,
}) => ({
	id: receiptBase.id,
	createdAt: getNow.zonedDateTime(),
	name: receiptBase.name,
	currencyCode: receiptBase.currencyCode,
	issued: receiptBase.issued,
	ownerUserId: selfUserId,
	selfUserId,
	debt: {
		direction: "outcoming",
		ids: [],
	},
	items: receiptItemsConsumers,
	participants: receiptParticipants,
	payers: receiptPayers,
});
