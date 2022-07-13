import React from "react";

import { Block } from "app/components/utils/block";
import { MutationWrapper } from "app/components/utils/mutation-wrapper";
import { RemoveButton } from "app/components/utils/remove-button";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import {
	getOutboundIntention,
	updateOutboundIntentions,
} from "app/utils/queries/account-connection-intentions-get-all";
import { Text } from "app/utils/styles";

const deleteMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.delete",
	ReturnType<typeof getOutboundIntention>
> = {
	onMutate: (trpcContext) => (variables) => {
		const intentionSnapshot = getOutboundIntention(
			trpcContext,
			variables.targetAccountId
		);
		updateOutboundIntentions(trpcContext, (intentions) =>
			intentions.filter(
				(intention) => intention.accountId !== variables.targetAccountId
			)
		);
		return intentionSnapshot;
	},
	onError: (trpcContext) => (_error, _variables, intentionSnapshot) => {
		if (!intentionSnapshot) {
			return;
		}
		updateOutboundIntentions(trpcContext, (intentions) => [
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
