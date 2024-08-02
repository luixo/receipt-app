import type { Faker } from "@faker-js/faker";

import type { TRPCQueryOutput } from "~app/trpc";
import type { AccountsId, UsersId } from "~db";
import { generateAmount } from "~tests/frontend/utils/generators";
import type { Amount } from "~tests/frontend/utils/generators";
import { CURRENCY_CODES } from "~utils/currency-data";

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

export type GenerateUsers = (opts: { faker: Faker; amount?: Amount }) => {
	id: UsersId;
	name: string;
	connectedAccount?: {
		accountId: AccountsId;
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

const generateReceiptBase = (
	faker: Faker,
): TRPCQueryOutput<"receiptTransferIntentions.getAll">["inbound"][number]["receipt"] => ({
	id: faker.string.uuid(),
	name: faker.commerce.product(),
	issued: new Date(),
	sum: Number(faker.finance.amount()),
	currencyCode: faker.helpers.arrayElement(CURRENCY_CODES),
});

export type GenerateTransferIntentions = (opts: {
	faker: Faker;
	users: ReturnType<GenerateUsers>;
	inboundAmount?: number;
	outboundAmount?: number;
}) => TRPCQueryOutput<"receiptTransferIntentions.getAll">;

export const defaultGenerateTransferIntentions: GenerateTransferIntentions = ({
	faker,
	users,
	inboundAmount = 0,
	outboundAmount = 0,
}) => ({
	inbound: new Array(inboundAmount).fill(null).map((_, index) => ({
		receipt: generateReceiptBase(faker),
		userId: users[index % users.length]!.id,
	})),
	outbound: new Array(outboundAmount).fill(null).map((_, index) => ({
		receipt: generateReceiptBase(faker),
		userId: users[index % users.length]!.id,
	})),
});
