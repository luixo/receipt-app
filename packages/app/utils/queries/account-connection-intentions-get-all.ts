import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Intentions = TRPCQueryOutput<"account-connection-intentions.get-all">;
type InboundIntention = Intentions["inbound"][number];
type OutboundIntention = Intentions["outbound"][number];

const getIntentions = (trpc: TRPCReactContext) =>
	trpc.getQueryData(["account-connection-intentions.get-all"]);
const setIntentions = (trpc: TRPCReactContext, data: Intentions) =>
	trpc.setQueryData(["account-connection-intentions.get-all"], data);

const updateIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: Intentions) => Intentions
) => {
	const prevIntentions = getIntentions(trpc);
	if (!prevIntentions) {
		return;
	}
	setIntentions(trpc, updater(prevIntentions));
};

const updateInboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: InboundIntention[]) => InboundIntention[]
) => {
	updateIntentions(trpc, (intentions) => ({
		...intentions,
		inbound: updater(intentions.inbound),
	}));
};

export const removeInboundIntention = (
	trpc: TRPCReactContext,
	shouldRemove: (intention: InboundIntention) => boolean
) => {
	let removedIntention:
		| { index: number; intention: InboundIntention }
		| undefined;
	updateInboundIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return intentions;
		}
		removedIntention = {
			index: matchedIndex,
			intention: intentions[matchedIndex]!,
		};
		return [
			...intentions.slice(0, matchedIndex),
			...intentions.slice(matchedIndex + 1),
		];
	});
	return removedIntention;
};

export const addInboundIntention = (
	trpc: TRPCReactContext,
	intention: InboundIntention,
	index = 0
) => {
	updateInboundIntentions(trpc, (intentions) => [
		...intentions.slice(0, index),
		intention,
		...intentions.slice(index),
	]);
};

const updateOutboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: OutboundIntention[]) => OutboundIntention[]
) => {
	updateIntentions(trpc, (intentions) => ({
		...intentions,
		outbound: updater(intentions.outbound),
	}));
};

export const removeOutboundIntention = (
	trpc: TRPCReactContext,
	shouldRemove: (intention: OutboundIntention) => boolean
) => {
	let removedIntention:
		| { index: number; intention: OutboundIntention }
		| undefined;
	updateOutboundIntentions(trpc, (intentions) => {
		const matchedIndex = intentions.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return intentions;
		}
		removedIntention = {
			index: matchedIndex,
			intention: intentions[matchedIndex]!,
		};
		return [
			...intentions.slice(0, matchedIndex),
			...intentions.slice(matchedIndex + 1),
		];
	});
	return removedIntention;
};

export const addOutboundIntention = (
	trpc: TRPCReactContext,
	intention: OutboundIntention,
	index = 0
) => {
	updateOutboundIntentions(trpc, (intentions) => [
		...intentions.slice(0, index),
		intention,
		...intentions.slice(index),
	]);
};
