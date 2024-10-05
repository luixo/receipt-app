import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";

type DebtPartial = Pick<
	TRPCQueryOutput<"debts.get">,
	"amount" | "currencyCode" | "timestamp"
>;

export const areDebtsSynced = (debt: DebtPartial, theirDebt: DebtPartial) =>
	debt.amount === theirDebt.amount &&
	debt.currencyCode === theirDebt.currencyCode &&
	debt.timestamp.valueOf() === theirDebt.timestamp.valueOf();

export const isDebtInSyncWithReceipt = (
	receiptDebt: Pick<
		TRPCQueryOutput<"receipts.get">,
		"currencyCode" | "issued" | "id"
	> & {
		participantSum: number;
	},
	debt: DebtPartial & {
		receiptId?: ReceiptsId;
	},
) =>
	receiptDebt.currencyCode === debt.currencyCode &&
	receiptDebt.participantSum === debt.amount &&
	receiptDebt.issued.valueOf() === debt.timestamp.valueOf() &&
	receiptDebt.id === debt.receiptId;
