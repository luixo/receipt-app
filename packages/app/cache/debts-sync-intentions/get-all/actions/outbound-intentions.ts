import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

import { OutboundDebtsIntention as DebtsIntention } from "../types";
import { updateDebtsOutboundIntentions as updateIntentions } from "../utils";

export const update = (
	trpc: TRPCReactContext,
	debtId: DebtsId,
	updater: (intention: DebtsIntention) => DebtsIntention
) => {
	const updatedIntentionRef = createRef<DebtsIntention | undefined>();
	updateIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(
			(intention) => intention.id === debtId
		);
		if (matchedIndex === -1) {
			return intentions;
		}
		const prevIntention = intentions[matchedIndex]!;
		const nextIntention = updater(prevIntention);
		if (nextIntention === prevIntention) {
			return intentions;
		}
		updatedIntentionRef.current = prevIntention;
		return [
			...intentions.slice(0, matchedIndex),
			nextIntention,
			...intentions.slice(matchedIndex + 1),
		];
	});
	return updatedIntentionRef.current;
};

export const remove = (trpc: TRPCReactContext, debtId: DebtsId) => {
	const removedIntentionRef = createRef<
		{ index: number; intention: DebtsIntention } | undefined
	>();
	updateIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(
			(intention) => intention.id === debtId
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
	intention: DebtsIntention,
	index = 0
) => {
	updateIntentions(trpc, (intentions) => [
		...intentions.slice(0, index),
		intention,
		...intentions.slice(index),
	]);
};
