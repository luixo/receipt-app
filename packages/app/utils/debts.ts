import type { TRPCQueryOutput } from "~app/trpc";

type DebtPartial = Pick<
	TRPCQueryOutput<"debts.get">,
	"amount" | "currencyCode" | "timestamp"
>;

export const areDebtsSynced = (debt: DebtPartial, theirDebt: DebtPartial) =>
	debt.amount === theirDebt.amount &&
	debt.currencyCode === theirDebt.currencyCode &&
	Temporal.PlainDate.compare(debt.timestamp, theirDebt.timestamp) === 0;

export const isDebtInSyncWithReceipt = (
	receiptDebt: Pick<
		TRPCQueryOutput<"receipts.get">,
		"currencyCode" | "issued" | "id"
	> & {
		participantSum: number;
	},
	debt: DebtPartial,
) =>
	receiptDebt.currencyCode === debt.currencyCode &&
	receiptDebt.participantSum === debt.amount &&
	Temporal.PlainDate.compare(receiptDebt.issued, debt.timestamp) === 0;
