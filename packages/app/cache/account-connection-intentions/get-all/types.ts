import { TRPCQueryOutput } from "app/trpc";

export type Intentions = TRPCQueryOutput<"accountConnectionIntentions.getAll">;
export type InboundIntention = Intentions["inbound"][number];
export type OutboundIntention = Intentions["outbound"][number];
