import React from "react";

import { Input } from "@nextui-org/react";
import { MdLinkOff as UnlinkIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["outbound"][number];
};

export const OutboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const removeConnectionMutation =
		trpc.accountConnectionIntentions.remove.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.remove.options)
		);
	const removeConnection = React.useCallback(() => {
		removeConnectionMutation.mutate({
			type: "targetAccountId",
			targetAccountId: intention.accountId,
		});
	}, [removeConnectionMutation, intention.accountId]);

	return (
		<Input
			value={intention.email}
			label={intention.userName}
			readOnly
			helperColor="error"
			helperText={removeConnectionMutation.error?.message}
			contentRightStyling={false}
			contentRight={
				<IconButton
					title="Unlink user from email"
					light
					isLoading={removeConnectionMutation.isLoading}
					icon={<UnlinkIcon size={24} />}
					onClick={removeConnection}
				/>
			}
		/>
	);
};
