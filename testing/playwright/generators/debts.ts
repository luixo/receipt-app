import { isNonNullish } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import { getParticipantSums } from "~app/utils/receipt-item";
import type { UsersId } from "~db/models";

import type { GenerateSelfAccount } from "./accounts";
import type {
	GenerateReceiptBase,
	GenerateReceiptItemsParts,
	GenerateReceiptParticipants,
} from "./receipts";
import { generateAmount, generateCurrencyCode } from "./utils";
import type { GeneratorFnWithAmount, GeneratorFnWithFaker } from "./utils";

export type GenerateDebts = GeneratorFnWithAmount<
	TRPCQueryOutput<"debts.get">,
	{ userId: UsersId }
>;

export const defaultGenerateDebts = ({
	faker,
	amount = { min: 3, max: 6 },
	userId,
}: Parameters<GenerateDebts>[0]): ReturnType<GenerateDebts> =>
	generateAmount(faker, amount, () => ({
		id: faker.string.uuid(),
		currencyCode: generateCurrencyCode(faker),
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
		userId,
	}));

export type GenerateDebtsFromReceipt = GeneratorFnWithFaker<
	TRPCQueryOutput<"debts.get">[],
	{
		selfAccount: ReturnType<GenerateSelfAccount>;
		receiptItemsParts: ReturnType<GenerateReceiptItemsParts>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptBase: ReturnType<GenerateReceiptBase>;
	}
>;

export const defaultGenerateDebtsFromReceipt: GenerateDebtsFromReceipt = ({
	faker,
	selfAccount,
	receiptItemsParts,
	participants,
	receiptBase,
}) =>
	getParticipantSums(receiptBase.id, receiptItemsParts, participants)
		.map((participantSum) => {
			if (participantSum.userId === selfAccount.userId) {
				return null;
			}
			if (participantSum.sum === 0) {
				return null;
			}
			const debtLockedTimestamp = faker.date.recent({
				days: 1,
				refDate: new Date(),
			});
			return {
				id: faker.string.uuid(),
				currencyCode: receiptBase.currencyCode,
				receiptId: receiptBase.id,
				userId: participantSum.userId,
				timestamp: receiptBase.issued,
				note: `Fake receipt "${receiptBase.name}"`,
				amount: participantSum.sum,
				lockedTimestamp: debtLockedTimestamp,
				their: {
					lockedTimestamp: debtLockedTimestamp,
					currencyCode: receiptBase.currencyCode,
					timestamp: receiptBase.issued,
					amount: participantSum.sum,
				},
			};
		})
		.filter(isNonNullish);
