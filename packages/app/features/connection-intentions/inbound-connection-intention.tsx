import React from "react";

import { Button, Container, Spacer, Text } from "@nextui-org/react";
import { InfiniteData } from "react-query";

import { cache } from "app/cache";
import { UsersPicker } from "app/components/app/users-picker";
import { MutationErrorMessage } from "app/components/error-message";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type UsersResult = TRPCQueryOutput<"users.get-not-connected">;

const extractUsers = (data: InfiniteData<UsersResult>) =>
	data.pages.reduce<UsersResult["items"]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);

type Props = {
	intention: TRPCQueryOutput<"account-connection-intentions.get-all">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const [input] = cache.users.getNotConnected.useStore();
	const usersQuery = trpc.useInfiniteQuery(["users.get-not-connected", input], {
		getNextPageParam: cache.users.getNotConnected.getNextPage,
	});
	const loadMore = React.useCallback(() => {
		usersQuery.fetchNextPage();
	}, [usersQuery]);
	const [user, setUser] = React.useState<UsersResult["items"][number]>();

	const acceptConnectionMutation = trpc.useMutation(
		"account-connection-intentions.accept",
		useTrpcMutationOptions(cache.accountConnections.accept.mutationOptions)
	);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.accountId,
			userId: user!.id,
		});
	}, [acceptConnectionMutation, intention.accountId, user]);

	const rejectConnectionMutation = trpc.useMutation(
		"account-connection-intentions.reject",
		useTrpcMutationOptions(cache.accountConnections.reject.mutationOptions)
	);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.accountId,
		});
	}, [rejectConnectionMutation, intention.accountId]);

	const isLoading =
		acceptConnectionMutation.isLoading || rejectConnectionMutation.isLoading;
	const selectedUsers = React.useMemo(() => (user ? [user] : []), [user]);
	return (
		<>
			<Text>{intention.email}</Text>
			<Spacer y={0.5} />
			<UsersPicker<UsersResult, UsersResult["items"][number]>
				type="linear"
				query={usersQuery}
				extractUsers={extractUsers}
				extractDetails={({ id, name }) => ({ id, name })}
				selectedUsers={selectedUsers}
				onUserClick={setUser}
				loadMore={loadMore}
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
			{acceptConnectionMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={acceptConnectionMutation} />
				</>
			) : null}
			{rejectConnectionMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={rejectConnectionMutation} />
				</>
			) : null}
		</>
	);
};
