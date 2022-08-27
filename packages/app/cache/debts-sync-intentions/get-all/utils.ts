import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { InboundDebtsIntention, OutboundDebtsIntention } from "./types";

export const updateDebtsInboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: InboundDebtsIntention[]) => InboundDebtsIntention[]
) =>
	createController(trpc).update((intentions) => {
		const nextIntentions = updater(intentions.inbound);
		if (nextIntentions === intentions.inbound) {
			return intentions;
		}
		return {
			...intentions,
			inbound: nextIntentions,
		};
	});

export const updateDebtsOutboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: OutboundDebtsIntention[]) => OutboundDebtsIntention[]
) =>
	createController(trpc).update((intentions) => {
		const nextIntentions = updater(intentions.outbound);
		if (nextIntentions === intentions.outbound) {
			return intentions;
		}
		return {
			...intentions,
			outbound: nextIntentions,
		};
	});
