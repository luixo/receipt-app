import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { createController } from "../controller";
import { OutboundIntention } from "../types";

const updateOutboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: OutboundIntention[]) => OutboundIntention[]
) =>
	createController(trpc).update((intentions) => ({
		...intentions,
		outbound: updater(intentions.outbound),
	}));

export const remove = (
	trpc: TRPCReactContext,
	shouldRemove: (intention: OutboundIntention) => boolean
) => {
	const removedIntentionRef = createRef<
		{ index: number; intention: OutboundIntention } | undefined
	>();
	updateOutboundIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return intentions;
		}
		removedIntentionRef.current = {
			index: matchedIndex,
			intention: intentions[matchedIndex]!,
		};
		return [
			...intentions.slice(0, matchedIndex),
			...intentions.slice(matchedIndex + 1),
		];
	});
	return removedIntentionRef.current;
};

export const add = (
	trpc: TRPCReactContext,
	intention: OutboundIntention,
	index = 0
) =>
	updateOutboundIntentions(trpc, (intentions) => [
		...intentions.slice(0, index),
		intention,
		...intentions.slice(index),
	]);
