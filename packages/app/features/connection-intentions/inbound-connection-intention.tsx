import React from "react";
import { View } from "react-native";

import { skipToken } from "@tanstack/react-query";

import { LoadableUser } from "~app/components/app/loadable-user";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";
import { options as accountConnectionsAcceptOptions } from "~mutations/account-connection-intentions/accept";
import { options as accountConnectionsRejectOptions } from "~mutations/account-connection-intentions/reject";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const [userId, setUserId] = React.useState<UsersId>();

	const acceptConnectionMutation =
		trpc.accountConnectionIntentions.accept.useMutation(
			useTrpcMutationOptions(accountConnectionsAcceptOptions),
		);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.account.id,
			userId: userId || "unset user id",
		});
	}, [acceptConnectionMutation, intention.account.id, userId]);

	const rejectConnectionMutation =
		trpc.accountConnectionIntentions.reject.useMutation(
			useTrpcMutationOptions(accountConnectionsRejectOptions),
		);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.account.id,
		});
	}, [rejectConnectionMutation, intention.account.id]);

	const userQuery = trpc.users.get.useQuery(
		userId ? { id: userId } : skipToken,
	);

	const isLoading =
		acceptConnectionMutation.isPending || rejectConnectionMutation.isPending;
	return (
		<View className="gap-2">
			<Text>{intention.account.email}</Text>
			<UsersSuggest
				selected={userId}
				onUserClick={setUserId}
				options={React.useMemo(() => ({ type: "not-connected" }), [])}
				closeOnSelect
			>
				{userId ? (
					<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
				) : null}
			</UsersSuggest>
			<Button
				color="primary"
				isDisabled={!userId || isLoading}
				onPress={acceptConnection}
				title={
					userQuery.status === "success"
						? `Connect ${intention.account.email} as ${userQuery.data.name}`
						: ""
				}
			>
				{userId
					? userQuery.status === "success"
						? `Connect "${userQuery.data.name}"`
						: "..."
					: "Please choose user above to accept intention"}
			</Button>
			<Button
				color="warning"
				variant="bordered"
				isDisabled={isLoading}
				onPress={rejectConnection}
			>
				Reject connection
			</Button>
		</View>
	);
};
