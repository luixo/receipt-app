import { TRPCQueryOutput } from "app/trpc";

export type DebtsIntentions = TRPCQueryOutput<"debts-sync-intentions.get-all">;
export type OutboundDebtsIntention = DebtsIntentions["outbound"][number];
export type InboundDebtsIntention = DebtsIntentions["inbound"][number];
