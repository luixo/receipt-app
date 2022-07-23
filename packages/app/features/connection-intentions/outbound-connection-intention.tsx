import React from "react";

import { Input } from "@nextui-org/react";
import { MdLinkOff as UnlinkIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { deleteMutationOptions } from "./delete-mutation-options";

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
			type: "targetAccountId",
			targetAccountId: intention.accountId,
		});
	}, [deleteConnectionMutation, intention.accountId]);

	return (
		<Input
			value={intention.email}
			label={intention.userName}
			readOnly
			helperColor="error"
			helperText={deleteConnectionMutation.error?.message}
			contentRightStyling={false}
			contentRight={
				<IconButton
					title="Unlink user from email"
					light
					isLoading={deleteConnectionMutation.isLoading}
					icon={<UnlinkIcon size={24} />}
					onClick={deleteConnection}
				/>
			}
		/>
	);
};
