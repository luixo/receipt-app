import type { Faker } from "@faker-js/faker";

import type { TRPCQueryOutput } from "~app/trpc";
import type { AccountsId, UsersId } from "~db";
import { generateAmount } from "~tests/frontend/utils/generators";
import type { Amount } from "~tests/frontend/utils/generators";
import { CURRENCY_CODES } from "~web/utils/currency";

const getRandomCurrencyCode = (faker: Faker) =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export type GenerateDebts = (opts: {
	faker: Faker;
	amount?: Amount;
}) => TRPCQueryOutput<"debts.getUser">;

export const defaultGenerateDebts: GenerateDebts = ({
	faker,
	amount = { min: 3, max: 8 },
}) =>
	Array.from({ length: generateAmount(faker, amount) }, () => ({
		id: faker.string.uuid(),
		currencyCode: getRandomCurrencyCode(faker),
		created: new Date(),
		timestamp: faker.date.recent({
			days: 30,
			refDate: new Date(),
		}),
		note: faker.lorem.words(4),
		receiptId: undefined,
		amount: faker.number.float({ min: -10000, max: 10000, precision: 0.01 }),
		lockedTimestamp: faker.datatype.boolean() ? new Date() : undefined,
		their: undefined,
	}));

export type GenerateUser = (opts: { faker: Faker }) => {
	id: UsersId;
	name: string;
	publicName: string | undefined;
	connectedAccount:
		| {
				id: AccountsId;
				email: string;
				avatarUrl?: string;
		  }
		| undefined;
};

export const defaultGenerateUser: GenerateUser = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.person.fullName(),
	publicName: undefined,
	connectedAccount: undefined,
});
