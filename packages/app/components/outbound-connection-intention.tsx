import React from "react";
import { trpc, TRPCQueryOutput } from "../trpc";
import { Text } from "../utils/styles";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { MutationWrapper } from "./utils/mutation-wrapper";
import {
	getOutboundIntention,
	updateOutboundIntentions,
} from "../utils/queries/account-connection-intentions-get-all";
import { RemoveButton } from "./utils/remove-button";
import { Block } from "./utils/block";

const deleteMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.delete",
	ReturnType<typeof getOutboundIntention>
> = {
	onMutate: (trpc) => (variables) => {
		const intentionSnapshot = getOutboundIntention(
			trpc,
			variables.targetAccountId
		);
		updateOutboundIntentions(trpc, (intentions) =>
			intentions.filter(
				(intention) => intention.accountId !== variables.targetAccountId
			)
		);
		return intentionSnapshot;
	},
	onError: (trpc) => (_error, _variables, intentionSnapshot) => {
		if (!intentionSnapshot) {
			return;
		}
		updateOutboundIntentions(trpc, (intentions) => [
			...intentions.slice(0, intentionSnapshot.index),
			intentionSnapshot.intention,
			...intentions.slice(intentionSnapshot.index),
		]);
	},
};

type InnerProps = {
	intention: TRPCQueryOutput<"account-connection-intentions.get-all">["outbound"][number];
};

export const OutboundConnectionIntention: React.FC<InnerProps> = ({
	intention,
}) => {
	const deleteConnectionMutation = trpc.useMutation(
		"account-connection-intentions.delete",
		useTrpcMutationOptions(deleteMutationOptions)
	);
	const deleteConnection = React.useCallback(() => {
		deleteConnectionMutation.mutate({
			targetAccountId: intention.accountId,
		});
	}, [deleteConnectionMutation, intention.accountId]);

	return (
		<Block
			name={`Outbound connection to ${intention.email} as ${intention.userName}`}
		>
			<RemoveButton onPress={deleteConnection}>Remove intention</RemoveButton>
			<MutationWrapper<"account-connection-intentions.delete">
				mutation={deleteConnectionMutation}
			>
				{() => <Text>Delete success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
