import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { AccountsId } from "next-app/db/models";

import { createController } from "../controller";
import { InboundIntention } from "../types";

const updateInboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: InboundIntention[]) => InboundIntention[]
) =>
	createController(trpc).update((intentions) => ({
		...intentions,
		inbound: updater(intentions.inbound),
	}));

export const remove = (trpc: TRPCReactContext, sourceAccountId: AccountsId) => {
	const removedIntentionRef = createRef<
		{ index: number; intention: InboundIntention } | undefined
	>();
	updateInboundIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(
			(intention) => intention.accountId === sourceAccountId
		);
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
	intention: InboundIntention,
	index = 0
) =>
	updateInboundIntentions(trpc, (intentions) => [
		...intentions.slice(0, index),
		intention,
		...intentions.slice(index),
	]);
