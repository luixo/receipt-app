import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { AccountsId } from "next-app/src/db/models";

type Intentions = TRPCQueryOutput<"account-connection-intentions.get-all">;
type InboundIntention = Intentions["inbound"][number];
type OutboundIntention = Intentions["outbound"][number];

export const getIntentions = (trpc: TRPCReactContext) =>
	trpc.getQueryData(["account-connection-intentions.get-all"]);

export const updateIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: Intentions) => Intentions
) => {
	const prevIntentions = trpc.getQueryData([
		"account-connection-intentions.get-all",
	]);
	if (!prevIntentions) {
		return;
	}
	const nextIntentions = updater(prevIntentions);
	trpc.setQueryData(["account-connection-intentions.get-all"], nextIntentions);
};

export const updateInboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: InboundIntention[]) => InboundIntention[]
) => {
	updateIntentions(trpc, (intentions) => ({
		...intentions,
		inbound: updater(intentions.inbound),
	}));
};

export const updateOutboundIntentions = (
	trpc: TRPCReactContext,
	updater: (intentions: OutboundIntention[]) => OutboundIntention[]
) => {
	updateIntentions(trpc, (intentions) => ({
		...intentions,
		outbound: updater(intentions.outbound),
	}));
};

export const getInboundIntention = (
	trpc: TRPCReactContext,
	accountId: AccountsId
) => {
	const intentions = getIntentions(trpc);
	if (!intentions) {
		return;
	}
	const matchedIntentionIndex = intentions.inbound.findIndex(
		(intention) => intention.accountId === accountId
	);
	if (matchedIntentionIndex === -1) {
		return;
	}
	return {
		index: matchedIntentionIndex,
		intention: intentions.inbound[matchedIntentionIndex]!,
	};
};

export const getOutboundIntention = (
	trpc: TRPCReactContext,
	accountId: AccountsId
) => {
	const intentions = getIntentions(trpc);
	if (!intentions) {
		return;
	}
	const matchedIntentionIndex = intentions.outbound.findIndex(
		(intention) => intention.accountId === accountId
	);
	if (matchedIntentionIndex === -1) {
		return;
	}
	return {
		index: matchedIntentionIndex,
		intention: intentions.outbound[matchedIntentionIndex]!,
	};
};

export const updateOutboundIntention = (
	trpc: TRPCReactContext,
	accountId: AccountsId,
	updater: (intention: OutboundIntention) => OutboundIntention
) => {
	updateIntentions(trpc, (intentions) => {
		const matchedIntentionIndex = intentions.outbound.findIndex(
			(intention) => intention.accountId === accountId
		);
		if (matchedIntentionIndex === -1) {
			return intentions;
		}
		return {
			...intentions,
			outbound: [
				...intentions.outbound.slice(0, matchedIntentionIndex),
				updater(intentions.outbound[matchedIntentionIndex]!),
				...intentions.outbound.slice(matchedIntentionIndex + 1),
			],
		};
	});
};
