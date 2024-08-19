import { isNonNullish } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import { MONTH } from "~utils/time";

import type { GenerateSelfAccount } from "./accounts";
import type { GenerateDebtsFromReceipt } from "./debts";
import { defaultGenerateDebtsFromReceipt } from "./debts";
import type { GenerateUsers } from "./users";
import type { GeneratorFnWithFaker } from "./utils";
import { generateCurrencyCode } from "./utils";

export type GenerateReceiptBase = GeneratorFnWithFaker<
	{
		id: ReceiptsId;
		name: string;
		currencyCode: CurrencyCode;
		issued: Date;
		lockedTimestamp?: Date;
	},
	{ selfAccount: ReturnType<GenerateSelfAccount> }
>;

export const defaultGenerateReceiptBase: GenerateReceiptBase = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.lorem.words(),
	currencyCode: generateCurrencyCode(faker),
	issued: new Date(),
	role: "owner",
});

export type GenerateReceiptItems = GeneratorFnWithFaker<
	{
		id: ReceiptItemsId;
		price: number;
		quantity: number;
		locked: boolean;
		name: string;
		created: Date;
	}[],
	{ selfAccount: ReturnType<GenerateSelfAccount> }
>;

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

export type GenerateReceiptParticipants = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">["participants"],
	{
		selfAccount: ReturnType<GenerateSelfAccount>;
		users: ReturnType<GenerateUsers>;
		addSelf?: boolean;
	}
>;

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
		].filter(isNonNullish);

export type GenerateReceiptItemsParts = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">["items"],
	{
		receiptItems: ReturnType<GenerateReceiptItems>;
		participants: ReturnType<GenerateReceiptParticipants>;
	}
>;

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

export type GenerateReceipt = GeneratorFnWithFaker<
	TRPCQueryOutput<"receipts.get">,
	{
		selfAccount: ReturnType<GenerateSelfAccount>;
		receiptBase: ReturnType<GenerateReceiptBase>;
		receiptItemsParts: ReturnType<GenerateReceiptItemsParts>;
		receiptParticipants: ReturnType<GenerateReceiptParticipants>;
		users: ReturnType<GenerateUsers>;
	}
>;

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
	transferIntentionUserId: undefined,
});

type MapDebt = (
	debt: ReturnType<GenerateDebtsFromReceipt>[number],
) => ReturnType<GenerateDebtsFromReceipt>[number] | undefined;

export const generateDebtsMapped =
	(...mapperSets: (MapDebt | MapDebt[])[]): GenerateDebtsFromReceipt =>
	(opts) =>
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
		}, defaultGenerateDebtsFromReceipt(opts));

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
