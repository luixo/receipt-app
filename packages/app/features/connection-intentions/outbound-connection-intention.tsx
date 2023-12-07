import React from "react";

import { Button, Input } from "@nextui-org/react";
import { MdLinkOff as UnlinkIcon } from "react-icons/md";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["outbound"][number];
};

export const OutboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const removeConnectionMutation =
		trpc.accountConnectionIntentions.remove.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.remove.options),
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
			labelPlacement="outside"
			isReadOnly
			isInvalid={Boolean(removeConnectionMutation.error)}
			errorMessage={removeConnectionMutation.error?.message}
			endContent={
				<Button
					title="Unlink user from email"
					variant="light"
					isLoading={removeConnectionMutation.isLoading}
					isIconOnly
					onClick={removeConnection}
				>
					<UnlinkIcon size={24} />
				</Button>
			}
		/>
	);
};
