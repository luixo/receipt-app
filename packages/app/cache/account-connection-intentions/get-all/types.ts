import { TRPCQueryOutput } from "app/trpc";

export type Intentions =
	TRPCQueryOutput<"account-connection-intentions.get-all">;
export type InboundIntention = Intentions["inbound"][number];
export type OutboundIntention = Intentions["outbound"][number];
