import { isNonNullish } from "remeda";

import type {
	Receipt,
	ReceiptItems,
	ReceiptParticipants,
	ReceiptPayers,
} from "~app/trpc-types";
import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptId, ReceiptItemId, UserId } from "~db/ids";
import type { GenerateDebts } from "~tests/frontend/generators/debts";

import type { GenerateUsers } from "./users";
import type { GeneratorFnWithFaker } from "./utils";
import { generateCurrencyCode } from "./utils";

export type GenerateReceiptBase = GeneratorFnWithFaker<{
	id: ReceiptId;
	name: string;
	currencyCode: CurrencyCode;
	issued: Temporal.PlainDate;
}>;

export const defaultGenerateReceiptBase: GenerateReceiptBase = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.lorem.words(),
	currencyCode: generateCurrencyCode(faker),
	issued: Temporal.Now.plainDateISO(),
	role: "owner",
});

export type GenerateReceiptItems = GeneratorFnWithFaker<
	{
		id: ReceiptItemId;
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
		createdAt: Temporal.Instant.from(
			faker.date
				.between({
					from: Temporal.Now.zonedDateTimeISO()
						.subtract({ months: 1 })
						.toInstant()
						.toString(),
					to: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
				})
				.toISOString(),
		).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
	}));

export type GenerateReceiptParticipants = GeneratorFnWithFaker<
	ReceiptParticipants,
	{
		selfUserId: UserId;
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
				createdAt: Temporal.Instant.from(
					faker.date.recent({ days: 5 }).toISOString(),
				).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
			})),
			addSelf
				? {
						userId: selfUserId,
						role: "owner" as const,
						createdAt: Temporal.Instant.from(
							faker.date.recent({ days: 5 }).toISOString(),
						).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
					}
				: undefined,
		].filter(isNonNullish);

export type GenerateReceiptPayers = GeneratorFnWithFaker<
	ReceiptPayers,
	{
		selfUserId: UserId;
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
			createdAt: Temporal.Instant.from(
				faker.date.recent({ days: 5 }).toISOString(),
			).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
		})),
		addSelf
			? {
					userId: selfUserId,
					part: 1,
					createdAt: Temporal.Instant.from(
						faker.date.recent({ days: 5 }).toISOString(),
					).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
				}
			: undefined,
	].filter(isNonNullish);

export type GenerateReceiptItemsWithConsumers = GeneratorFnWithFaker<
	ReceiptItems,
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
				createdAt: Temporal.Instant.from(
					faker.date
						.between({
							from: item.createdAt.toInstant().toString(),
							to: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
						})
						.toISOString(),
				).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
				userId: participant.userId,
				part: faker.number.int({ min: 1, max: 3 }),
			})),
			payers: [],
		}));

export type GenerateReceipt = GeneratorFnWithFaker<
	Receipt,
	{
		selfUserId: UserId;
		receiptBase: ReturnType<GenerateReceiptBase>;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		receiptParticipants: ReturnType<GenerateReceiptParticipants>;
		receiptPayers: ReturnType<GenerateReceiptPayers>;
		receiptDebts: ReturnType<GenerateDebts>;
		users: ReturnType<GenerateUsers>;
	}
>;

export const defaultGenerateReceipt: GenerateReceipt = ({
	selfUserId,
	receiptBase,
	receiptItemsWithConsumers: receiptItemsConsumers,
	receiptParticipants,
	receiptPayers,
	receiptDebts,
}) => ({
	id: receiptBase.id,
	createdAt: Temporal.Now.zonedDateTimeISO(),
	name: receiptBase.name,
	currencyCode: receiptBase.currencyCode,
	issued: receiptBase.issued,
	ownerUserId: selfUserId,
	selfUserId,
	debts: {
		direction: "outcoming",
		debts: receiptDebts.map((debt) => ({
			id: debt.id,
			userId: debt.userId,
		})),
	},
	items: receiptItemsConsumers,
	participants: receiptParticipants,
	payers: receiptPayers,
});
