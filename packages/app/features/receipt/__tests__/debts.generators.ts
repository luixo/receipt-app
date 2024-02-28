import type { Faker } from "@faker-js/faker";

import type { TRPCQueryOutput } from "~app/trpc";
import { getParticipantSums } from "~app/utils/receipt-item";
import { nonNullishGuard } from "~utils";

import type {
	GenerateReceiptBase,
	GenerateReceiptItemsParts,
	GenerateReceiptParticipants,
	GenerateSelfAccount,
} from "./generators";

const getFakeDebtNote = (receiptName: string) =>
	`Fake receipt "${receiptName}"`;

export type GenerateDebts = (opts: {
	faker: Faker;
	selfAccount: ReturnType<GenerateSelfAccount>;
	receiptItemsParts: ReturnType<GenerateReceiptItemsParts>;
	participants: ReturnType<GenerateReceiptParticipants>;
	receiptBase: ReturnType<GenerateReceiptBase>;
}) => TRPCQueryOutput<"debts.get">[];

export const defaultGenerateDebts: GenerateDebts = ({
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
				note: getFakeDebtNote(receiptBase.name),
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
		.filter(nonNullishGuard);

type MapDebt = (
	debt: ReturnType<GenerateDebts>[number],
) => ReturnType<GenerateDebts>[number] | undefined;

export const generateDebtsWith =
	(...mapperSets: (MapDebt | MapDebt[])[]): GenerateDebts =>
	(opts) =>
		mapperSets.reduce((acc, mapperSet) => {
			if (Array.isArray(mapperSet)) {
				return acc
					.map((debt, index) => mapperSet[index % mapperSet.length]!(debt))
					.filter(nonNullishGuard);
			}
			return acc.map(mapperSet).filter(nonNullishGuard);
		}, defaultGenerateDebts(opts));

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
		lockedTimestamp: debt.lockedTimestamp,
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount,
	},
});

export const theirDesynced: MapDebt = (debt) => ({
	...debt,
	their: {
		lockedTimestamp: debt.lockedTimestamp,
		currencyCode: debt.currencyCode,
		timestamp: debt.timestamp,
		amount: debt.amount + 1,
	},
});
