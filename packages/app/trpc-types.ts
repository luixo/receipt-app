import type { TRPCQueryOutput } from "~app/trpc";

// Account
export type Account = TRPCQueryOutput<"account.get">;
export type AccountSettings = TRPCQueryOutput<"accountSettings.get">;
// Users
export type User = TRPCQueryOutput<"users.get">;
export type ForeignUser = TRPCQueryOutput<"users.getForeign">;

export type AccountConnectionIntentions =
	TRPCQueryOutput<"accountConnectionIntentions.getAll">;
export type InboundIntention = AccountConnectionIntentions["inbound"][number];
export type OutboundIntention = AccountConnectionIntentions["outbound"][number];

// Debts
export type AggregatedDebts = TRPCQueryOutput<"debts.getAll">;
export type AggregatedDebt = AggregatedDebts["items"][number];

export type DebtsByUserPage = TRPCQueryOutput<"debts.getByUserPaged">;

export type Debt = TRPCQueryOutput<"debts.get">;

export type DebtIntention =
	TRPCQueryOutput<"debtIntentions.getAll">["items"][number];

// Receipts
export type Receipt = TRPCQueryOutput<"receipts.get">;
export type ReceiptParticipant = Receipt["participants"][number];
export type ReceiptPayer = Receipt["payers"][number];
export type ReceiptDebts = Receipt["debts"];
export type ReceiptItem = Receipt["items"][number];
export type ReceiptItemPayer = ReceiptItem["payers"][number];
export type ReceiptItemConsumer = ReceiptItem["consumers"][number];

export type ReceiptPageEntry =
	TRPCQueryOutput<"receipts.getPaged">["items"][number];

// Misc
export type Currencies = TRPCQueryOutput<"currency.top">["items"];
