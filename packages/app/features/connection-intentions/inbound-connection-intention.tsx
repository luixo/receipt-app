import React from "react";

import { Button, Container, Spacer, Text } from "@nextui-org/react";

import { UsersSuggest } from "app/components/app/users-suggest";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCInfiniteQueryOutput, TRPCQueryOutput } from "app/trpc";

type UsersResult = TRPCInfiniteQueryOutput<"users.suggest">;

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const [user, setUser] = React.useState<UsersResult["items"][number]>();

	const acceptConnectionMutation =
		trpc.accountConnectionIntentions.accept.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.accept.options)
		);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.accountId,
			userId: user!.id,
		});
	}, [acceptConnectionMutation, intention.accountId, user]);

	const rejectConnectionMutation =
		trpc.accountConnectionIntentions.reject.useMutation(
			useTrpcMutationOptions(mutations.accountConnections.reject.options)
		);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.accountId,
		});
	}, [rejectConnectionMutation, intention.accountId]);

	const isLoading =
		acceptConnectionMutation.isLoading || rejectConnectionMutation.isLoading;
	return (
		<>
			<Text>{intention.email}</Text>
			<Spacer y={0.5} />
			<UsersSuggest
				selected={user}
				onUserClick={setUser}
				options={React.useMemo(() => ({ type: "not-connected" }), [])}
				closeOnSelect
			/>
			<Spacer y={1} />
			<Container
				display="flex"
				direction="column"
				css={{ p: 0 }}
				alignItems="flex-end"
			>
				<Button
					auto
					disabled={!user || isLoading}
					onClick={acceptConnection}
					title={user ? `Connect ${intention.email} as ${user.name}` : ""}
				>
					{user ? `Connect "${user.name}"` : "Please choose user above"}
				</Button>
				<Spacer y={0.5} />
				<Button auto disabled={isLoading} onClick={rejectConnection}>
					Reject connection
				</Button>
			</Container>
		</>
	);
};
