import type { TRPCQueryOutput } from "~app/trpc";

export type AccountConnectionIntentions =
	TRPCQueryOutput<"accountConnectionIntentions.getAll">;
export type ConnectedAccount = TRPCQueryOutput<"users.get">["connectedAccount"];
export type Currencies = TRPCQueryOutput<"currency.top">["items"];
export type Debt = TRPCQueryOutput<"debts.get">;
export type DebtsByUserPage = TRPCQueryOutput<"debts.getByUserPaged">;
export type DebtIntention =
	TRPCQueryOutput<"debtIntentions.getAll">["items"][number];
export type DebtIntentions = TRPCQueryOutput<"debtIntentions.getAll">["items"];
export type DebtIntentionsQuery = TRPCQueryOutput<"debtIntentions.getAll">;
export type ForeignUser = TRPCQueryOutput<"users.getForeign">;
export type Receipt = TRPCQueryOutput<"receipts.get">;
export type ReceiptItem = Receipt["items"][number];
export type ReceiptParticipant = Receipt["participants"][number];
export type ReceiptPayers = Receipt["payers"];
export type ReceiptParticipants = Receipt["participants"];
export type ReceiptItems = Receipt["items"];
export type ReceiptPage = TRPCQueryOutput<"receipts.getPaged">;
export type User = TRPCQueryOutput<"users.get">;
