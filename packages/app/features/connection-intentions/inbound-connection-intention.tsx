import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react";

import { UsersSuggest } from "app/components/app/users-suggest";
import { Text } from "app/components/base/text";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCInfiniteQueryOutput, TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type UsersResult = TRPCInfiniteQueryOutput<"users.suggest">;

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const [user, setUser] = React.useState<UsersResult["items"][number]>();

	const acceptConnectionMutation =
		trpc.accountConnectionIntentions.accept.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.accept.options),
		);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.account.id,
			userId: user!.id,
		});
	}, [acceptConnectionMutation, intention.account.id, user]);

	const rejectConnectionMutation =
		trpc.accountConnectionIntentions.reject.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.reject.options),
		);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.account.id,
		});
	}, [rejectConnectionMutation, intention.account.id]);

	const isLoading =
		acceptConnectionMutation.isPending || rejectConnectionMutation.isPending;
	return (
		<View className="gap-2">
			<Text>{intention.account.email}</Text>
			<UsersSuggest
				selected={user}
				onUserClick={setUser}
				options={React.useMemo(() => ({ type: "not-connected" }), [])}
				closeOnSelect
			/>
			<Button
				color="primary"
				isDisabled={!user || isLoading}
				onClick={acceptConnection}
				title={user ? `Connect ${intention.account.email} as ${user.name}` : ""}
			>
				{user
					? `Connect "${user.name}"`
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
