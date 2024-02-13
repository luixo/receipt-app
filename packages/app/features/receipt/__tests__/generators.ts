import type { Faker } from "@faker-js/faker";

import type { TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";
import { MONTH } from "app/utils/time";
import { nonNullishGuard } from "app/utils/utils";
import type {
	AccountsId,
	ReceiptItemsId,
	ReceiptsId,
	UsersId,
} from "next-app/db/models";
import { CURRENCY_CODES } from "next-app/utils/currency";

const getRandomCurrencyCode = (faker: Faker) =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export type GenerateSelfAccount = (opts: { faker: Faker }) => {
	accountId: AccountsId;
	email: string;
	avatarUrl: string | undefined;
	userId: UsersId;
	name: string;
};

export const defaultGenerateSelfAccount: GenerateSelfAccount = ({ faker }) => {
	const accountId = faker.string.uuid();
	return {
		accountId,
		email: faker.internet.email(),
		avatarUrl: undefined,
		userId: accountId as UsersId,
		name: "Me",
	};
};

export type GenerateReceiptBase = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
}) => {
	id: ReceiptsId;
	name: string;
	currencyCode: CurrencyCode;
	issued: Date;
	lockedTimestamp?: Date;
};

export const defaultGenerateReceiptBase: GenerateReceiptBase = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.lorem.words(),
	currencyCode: getRandomCurrencyCode(faker),
	issued: new Date(),
	role: "owner",
});

export type GenerateReceiptItems = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
}) => {
	id: ReceiptItemsId;
	price: number;
	quantity: number;
	name: string;
	created: Date;
}[];

export const defaultGenerateReceiptItems: GenerateReceiptItems = ({ faker }) =>
	Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
		id: faker.string.uuid(),
		price: Number(faker.finance.amount()),
		quantity: faker.number.int({ max: 100 }),
		name: faker.commerce.productName(),
		created: faker.date.between({
			from: new Date(Date.now() - MONTH),
			to: new Date(),
		}),
	}));

export type GenerateUsers = (opts: {
	faker: Faker;
	min?: number;
	max?: number;
	amount?: number;
}) => {
	id: UsersId;
	name: string;
	connectedAccount?: {
		id: AccountsId;
		email: string;
		avatarUrl?: string;
	};
}[];

export const defaultGenerateUsers: GenerateUsers = ({
	faker,
	min = 3,
	max = 6,
	amount = 0,
}) =>
	Array.from(
		{
			length:
				amount ||
				(min === max
					? min
					: faker.number.int({ min, max: Math.max(min, max) })),
		},
		() => ({
			id: faker.string.uuid(),
			name: faker.person.fullName(),
		}),
	);

export type GenerateReceiptParticipants = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
	users: ReturnType<GenerateUsers>;
	addSelf?: boolean;
}) => TRPCQueryOutput<"receiptItems.get">["participants"];

export const defaultGenerateReceiptParticipants: GenerateReceiptParticipants =
	({ faker, users, selfAccount, addSelf = true }) =>
		[
			...users.map((user) => ({
				userId: user.id,
				role: "editor" as const,
				resolved: faker.datatype.boolean(),
				added: faker.date.recent({ days: 5, refDate: new Date() }),
			})),
			addSelf
				? {
						userId: selfAccount.userId,
						role: "owner" as const,
						resolved: false,
						added: faker.date.recent({ days: 5, refDate: new Date() }),
				  }
				: undefined,
		].filter(nonNullishGuard);

export type GenerateReceiptItemsParts = (opts: {
	faker: Faker;
	receiptItems: ReturnType<GenerateReceiptItems>;
	participants: ReturnType<GenerateReceiptParticipants>;
}) => TRPCQueryOutput<"receiptItems.get">["items"];

export const defaultGenerateReceiptItemsParts: GenerateReceiptItemsParts = ({
	faker,
	receiptItems,
	participants,
}) =>
	receiptItems.map((item) => ({
		id: item.id,
		price: item.price,
		quantity: item.quantity,
		locked: false,
		name: item.name,
		created: item.created,
		parts: participants.map((participant) => ({
			userId: participant.userId,
			part: faker.number.int({ min: 1, max: 3 }),
		})),
	}));

export type GenerateReceipt = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
	receiptBase: ReturnType<GenerateReceiptBase>;
	receiptItemsParts: ReturnType<GenerateReceiptItemsParts>;
	users: ReturnType<GenerateUsers>;
}) => TRPCQueryOutput<"receipts.get">;

export const defaultGenerateReceipt: GenerateReceipt = ({
	selfAccount,
	receiptBase,
	receiptItemsParts,
}) => ({
	id: receiptBase.id,
	name: receiptBase.name,
	currencyCode: receiptBase.currencyCode,
	issued: receiptBase.issued,
	participantResolved: false,
	ownerUserId: selfAccount.userId,
	selfUserId: selfAccount.userId,
	sum: round(
		receiptItemsParts.reduce(
			(acc, part) => acc + part.price * part.quantity,
			0,
		),
	),
	role: "owner",
	lockedTimestamp: receiptBase.lockedTimestamp,
	debt: undefined,
});
