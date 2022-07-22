import React from "react";

import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import {
	addOutboundIntention,
	removeOutboundIntention,
} from "app/utils/queries/account-connection-intentions-get-all";
import { Text } from "app/utils/styles";

const deleteMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.delete",
	ReturnType<typeof removeOutboundIntention>
> = {
	onMutate: (trpcContext) => (variables) =>
		removeOutboundIntention(
			trpcContext,
			(intention) => intention.accountId === variables.targetAccountId
		),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		addOutboundIntention(trpcContext, snapshot.intention, snapshot.index);
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
