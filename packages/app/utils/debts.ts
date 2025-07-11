import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";
import { areEqual } from "~utils/date";

type DebtPartial = Pick<
	TRPCQueryOutput<"debts.get">,
	"amount" | "currencyCode" | "timestamp"
>;

export const areDebtsSynced = (debt: DebtPartial, theirDebt: DebtPartial) =>
	debt.amount === theirDebt.amount &&
	debt.currencyCode === theirDebt.currencyCode &&
	areEqual.plainDate(debt.timestamp, theirDebt.timestamp);

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
	areEqual.plainDate(receiptDebt.issued, debt.timestamp) &&
	receiptDebt.id === debt.receiptId;
