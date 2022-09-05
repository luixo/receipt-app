import { TRPCQueryOutput } from "app/trpc";

export type DebtsIntentions = TRPCQueryOutput<"debtsSyncIntentions.getAll">;
export type OutboundDebtsIntention = DebtsIntentions["outbound"][number];
export type InboundDebtsIntention = DebtsIntentions["inbound"][number];
