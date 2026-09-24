import type { TRPCQueryOutput } from "~app/trpc";

// Account
export type Account = TRPCQueryOutput<"account.get">;
export type AccountSettings = TRPCQueryOutput<"accountSettings.get">;
// Peers
export type Peer = TRPCQueryOutput<"peers.get">;
export type ForeignPeer = TRPCQueryOutput<"peers.getForeign">;

export type AccountConnectionIntentions =
	TRPCQueryOutput<"accountConnectionIntentions.getAll">;
export type InboundIntention = AccountConnectionIntentions["inbound"][number];
export type OutboundIntention = AccountConnectionIntentions["outbound"][number];

// Debts
export type AggregatedDebts = TRPCQueryOutput<"debts.getAll">;
export type AggregatedDebt = AggregatedDebts["items"][number];

export type DebtsByPeerPage = TRPCQueryOutput<"debts.getByPeerPaged">;

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

export type ReceiptsByPeerPage = TRPCQueryOutput<"receipts.getByPeerPaged">;

// Misc
export type Currencies = TRPCQueryOutput<"currency.top">["items"];
