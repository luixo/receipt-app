import React from "react";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button, Input } from "~components";
import { UnlinkIcon } from "~components/icons";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["outbound"][number];
};

export const OutboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const removeConnectionMutation =
		trpc.accountConnectionIntentions.remove.useMutation(
			useTrpcMutationOptions(accountConnectionsRemoveOptions),
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
					onClick={removeConnection}
				>
					<UnlinkIcon size={24} />
				</Button>
			}
		/>
	);
};
