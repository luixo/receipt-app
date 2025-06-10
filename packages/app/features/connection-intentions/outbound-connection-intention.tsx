import React from "react";

import { useMutation } from "@tanstack/react-query";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { UnlinkIcon } from "~components/icons";
import { Input } from "~components/input";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["outbound"][number];
};

export const OutboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const trpc = useTRPC();
	const removeConnectionMutation = useMutation(
		trpc.accountConnectionIntentions.remove.mutationOptions(
			useTrpcMutationOptions(accountConnectionsRemoveOptions),
		),
	);
	const removeConnection = React.useCallback(() => {
		removeConnectionMutation.mutate({
			targetAccountId: intention.account.id,
		});
	}, [removeConnectionMutation, intention.account.id]);

	return (
		<Input
			value={intention.account.email}
			label={intention.user.name}
			isReadOnly
			mutation={removeConnectionMutation}
			endContent={
				<Button
					title="Unlink user from email"
					variant="light"
					isLoading={removeConnectionMutation.isPending}
					isIconOnly
					onPress={removeConnection}
				>
					<UnlinkIcon size={24} />
				</Button>
			}
		/>
	);
};
