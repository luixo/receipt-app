import type { Faker } from "@faker-js/faker";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { AccountsId, ReceiptItemsId, ReceiptsId, UsersId } from "~db";
import { generateAmount } from "~tests/frontend/utils/generators";
import type { Amount } from "~tests/frontend/utils/generators";
import { MONTH, nonNullishGuard } from "~utils";
import { CURRENCY_CODES } from "~web/utils/currency";

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
	locked: boolean;
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
		locked: false,
	}));

export type GenerateUsers = (opts: { faker: Faker; amount?: Amount }) => {
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
	amount = { min: 3, max: 6 },
}) =>
	Array.from({ length: generateAmount(faker, amount) }, () => ({
		id: faker.string.uuid(),
		name: faker.person.fullName(),
	}));

export type GenerateReceiptParticipants = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
	users: ReturnType<GenerateUsers>;
	addSelf?: boolean;
}) => TRPCQueryOutput<"receipts.get">["participants"];

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
}) => TRPCQueryOutput<"receipts.get">["items"];

export const defaultGenerateReceiptItemsParts: GenerateReceiptItemsParts = ({
	faker,
	receiptItems,
	participants,
}) =>
	receiptItems.map((item) => ({
		id: item.id,
		price: item.price,
		quantity: item.quantity,
		locked: item.locked,
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
	receiptParticipants: ReturnType<GenerateReceiptParticipants>;
	users: ReturnType<GenerateUsers>;
}) => TRPCQueryOutput<"receipts.get">;

export const defaultGenerateReceipt: GenerateReceipt = ({
	selfAccount,
	receiptBase,
	receiptItemsParts,
	receiptParticipants,
}) => ({
	id: receiptBase.id,
	name: receiptBase.name,
	currencyCode: receiptBase.currencyCode,
	issued: receiptBase.issued,
	ownerUserId: selfAccount.userId,
	selfUserId: selfAccount.userId,
	lockedTimestamp: receiptBase.lockedTimestamp,
	debt: {
		direction: "outcoming",
		ids: [],
	},
	items: receiptItemsParts,
	participants: receiptParticipants,
});
