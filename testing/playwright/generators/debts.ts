import { isNonNullish } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import { getParticipantSums } from "~app/utils/receipt-item";
import type { UsersId } from "~db/models";
import { add, getNow } from "~utils/date";

import type {
	GenerateReceiptBase,
	GenerateReceiptItemsWithConsumers,
	GenerateReceiptParticipants,
	GenerateReceiptPayers,
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
		createdAt: getNow.zonedDateTime(),
		timestamp: faker.temporal.recent.plainDate({
			days: 30,
			refDate: getNow.plainDate(),
		}),
		note: faker.lorem.words(4),
		receiptId: undefined,
		amount: faker.number.float({ min: -10000, max: 10000, precision: 0.01 }),
		updatedAt: getNow.zonedDateTime(),
		their: undefined,
		userId,
	}));

export type GenerateDebtsFromReceipt = GeneratorFnWithFaker<
	TRPCQueryOutput<"debts.get">[],
	{
		selfUserId: UsersId;
		receiptItemsWithConsumers: ReturnType<GenerateReceiptItemsWithConsumers>;
		participants: ReturnType<GenerateReceiptParticipants>;
		receiptPayers: ReturnType<GenerateReceiptPayers>;
		receiptBase: ReturnType<GenerateReceiptBase>;
		fromUnitToSubunit: (input: number) => number;
		fromSubunitToUnit: (input: number) => number;
	}
>;

export const defaultGenerateDebtsFromReceipt: GenerateDebtsFromReceipt = ({
	faker,
	selfUserId,
	receiptItemsWithConsumers,
	participants,
	receiptPayers,
	receiptBase,
	fromUnitToSubunit,
	fromSubunitToUnit,
}) =>
	getParticipantSums(
		receiptBase.id,
		receiptItemsWithConsumers,
		participants,
		receiptPayers,
		fromUnitToSubunit,
	)
		.map((participantSum) => {
			if (participantSum.userId === selfUserId) {
				return null;
			}
			const sum = fromSubunitToUnit(
				participantSum.debtSumDecimals - participantSum.paySumDecimals,
			);
			if (sum === 0) {
				return null;
			}
			return {
				id: faker.string.uuid(),
				currencyCode: receiptBase.currencyCode,
				receiptId: receiptBase.id,
				userId: participantSum.userId,
				timestamp: receiptBase.issued,
				note: `Fake receipt "${receiptBase.name}"`,
				amount: sum,
				updatedAt: getNow.zonedDateTime(),
				their: {
					updatedAt: getNow.zonedDateTime(),
					currencyCode: receiptBase.currencyCode,
					timestamp: receiptBase.issued,
					amount: sum,
				},
			};
		})
		.filter(isNonNullish);

type MapDebt = (
	debt: ReturnType<GenerateDebtsFromReceipt>[number],
) => ReturnType<GenerateDebtsFromReceipt>[number] | undefined;

export const remapDebts =
	(...mapperSets: (MapDebt | MapDebt[])[]) =>
	(originalDebts: ReturnType<GenerateDebtsFromReceipt>) =>
		mapperSets.reduce((acc, mapperSet) => {
			if (Array.isArray(mapperSet)) {
				return (
					acc
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						.map((debt, index) => mapperSet[index % mapperSet.length]!(debt))
						.filter(isNonNullish)
				);
			}
			return acc.map(mapperSet).filter(isNonNullish);
		}, originalDebts);

export const ourNonExistent: MapDebt = () => undefined;

export const ourSynced: MapDebt = (debt) => debt;

export const ourDesynced: MapDebt = (debt) => ({
	...debt,
	amount: debt.amount + 1,
});

export const theirNonExistent: MapDebt = (debt) => ({
	...debt,
	their: undefined,
});

export const theirSynced: MapDebt = (debt) => ({
	...debt,
	their: {
		updatedAt: add.zonedDateTime(debt.updatedAt, { seconds: 1 }),
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount,
	},
});

export const theirDesynced: MapDebt = (debt) => ({
	...debt,
	their: {
		updatedAt: add.zonedDateTime(debt.updatedAt, { seconds: 1 }),
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount + 1,
	},
});
