import type { TRPCQueryOutput } from "~app/trpc";

export type TRPCAccountConnectionIntentions =
	TRPCQueryOutput<"accountConnectionIntentions.getAll">;
export type TRPCConnectedAccount =
	TRPCQueryOutput<"users.get">["connectedAccount"];
export type TRPCCurrencies = TRPCQueryOutput<"currency.top">["items"];
export type TRPCDebt = TRPCQueryOutput<"debts.get">;
export type TRPCDebtsByUserPage = TRPCQueryOutput<"debts.getByUserPaged">;
export type TRPCDebtIntention =
	TRPCQueryOutput<"debtIntentions.getAll">["items"][number];
export type TRPCDebtIntentions =
	TRPCQueryOutput<"debtIntentions.getAll">["items"];
export type TRPCDebtIntentionsQuery = TRPCQueryOutput<"debtIntentions.getAll">;
export type TRPCForeignUser = TRPCQueryOutput<"users.getForeign">;
export type TRPCReceipt = TRPCQueryOutput<"receipts.get">;
export type TRPCReceiptItem = TRPCReceipt["items"][number];
export type TRPCReceiptParticipant = TRPCReceipt["participants"][number];
export type TRPCReceiptPayers = TRPCReceipt["payers"];
export type TRPCReceiptParticipants = TRPCReceipt["participants"];
export type TRPCReceiptItems = TRPCReceipt["items"];
export type TRPCReceiptPage = TRPCQueryOutput<"receipts.getPaged">;
export type TRPCUser = TRPCQueryOutput<"users.get">;
