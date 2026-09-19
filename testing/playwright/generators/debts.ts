import { isNonNullish } from "remeda";

import type { TRPCDebt, TRPCDebtIntention } from "~app/trpc-types";
import { getParticipantSums } from "~app/utils/receipt-item";
import type { UserId } from "~db/ids";

import type {
	GenerateReceiptBase,
	GenerateReceiptItemsWithConsumers,
	GenerateReceiptParticipants,
	GenerateReceiptPayers,
} from "./receipts";
import { generateAmount, generateCurrencyCode } from "./utils";
import type { GeneratorFnWithAmount, GeneratorFnWithFaker } from "./utils";

export type GenerateDebts = GeneratorFnWithAmount<TRPCDebt, { userId: UserId }>;

export const defaultGenerateDebts = ({
	faker,
	amount = { min: 3, max: 6 },
	userId,
}: Parameters<GenerateDebts>[0]): ReturnType<GenerateDebts> =>
	generateAmount(faker, amount, () => ({
		id: faker.string.uuid(),
		currencyCode: generateCurrencyCode(faker),
		createdAt: Temporal.Now.zonedDateTimeISO(),
		timestamp: Temporal.Instant.from(
			faker.date.recent({ days: 30 }).toISOString(),
		)
			.toZonedDateTimeISO(Temporal.Now.timeZoneId())
			.toPlainDate(),
		note: faker.lorem.words(4),
		receiptId: undefined,
		amount: faker.number.float({ min: -10_000, max: 10_000, multipleOf: 0.01 }),
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		their: undefined,
		userId,
	}));

export type GenerateDebtIntentions = GeneratorFnWithAmount<
	TRPCDebtIntention,
	{ userId: UserId }
>;

export const defaultGenerateDebtIntentions = ({
	faker,
	amount = { min: 3, max: 6 },
	userId,
}: Parameters<GenerateDebtIntentions>[0]): ReturnType<GenerateDebtIntentions> =>
	generateAmount(faker, amount, () => ({
		id: faker.string.uuid(),
		userId,
		amount: faker.number.float({ min: -10_000, max: 10_000, multipleOf: 0.01 }),
		currencyCode: generateCurrencyCode(faker),
		timestamp: Temporal.Instant.from(
			faker.date.recent({ days: 30 }).toISOString(),
		)
			.toZonedDateTimeISO(Temporal.Now.timeZoneId())
			.toPlainDate(),
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		note: faker.lorem.words(4),
	}));

export type GenerateDebtsFromReceipt = GeneratorFnWithFaker<
	TRPCDebt[],
	{
		selfUserId: UserId;
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
		selfUserId,
		receiptItemsWithConsumers,
		participants,
		receiptPayers,
		fromUnitToSubunit,
		fromSubunitToUnit,
	)
		.map((participantSum) => {
			if (participantSum.userId === selfUserId) {
				return null;
			}
			if (participantSum.balance === 0) {
				return null;
			}
			return {
				id: faker.string.uuid(),
				currencyCode: receiptBase.currencyCode,
				receiptId: receiptBase.id,
				userId: participantSum.userId,
				timestamp: receiptBase.issued,
				note: `Fake receipt "${receiptBase.name}"`,
				amount: participantSum.balance,
				updatedAt: Temporal.Now.zonedDateTimeISO(),
				their: {
					updatedAt: Temporal.Now.zonedDateTimeISO(),
					currencyCode: receiptBase.currencyCode,
					timestamp: receiptBase.issued,
					amount: participantSum.balance,
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
						// oxlint-disable-next-line typescript/no-non-null-assertion
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
		updatedAt: debt.updatedAt.add({ seconds: 1 }),
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount,
	},
});

export const theirDesynced: MapDebt = (debt) => ({
	...debt,
	their: {
		updatedAt: debt.updatedAt.add({ seconds: 1 }),
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount + 1,
	},
});
