import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react";

import { UsersSuggest } from "app/components/app/users-suggest";
import { Text } from "app/components/base/text";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const [userId, setUserId] = React.useState<UsersId>();

	const acceptConnectionMutation =
		trpc.accountConnectionIntentions.accept.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.accept.options),
		);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.account.id,
			userId: userId!,
		});
	}, [acceptConnectionMutation, intention.account.id, userId]);

	const rejectConnectionMutation =
		trpc.accountConnectionIntentions.reject.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.reject.options),
		);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.account.id,
		});
	}, [rejectConnectionMutation, intention.account.id]);

	const userQuery = trpc.users.get.useQuery(
		{ id: userId || "unknown" },
		{ enabled: Boolean(userId) },
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
			/>
			<Button
				color="primary"
				isDisabled={!userId || isLoading}
				onClick={acceptConnection}
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
				onClick={rejectConnection}
			>
				Reject connection
			</Button>
		</View>
	);
};
