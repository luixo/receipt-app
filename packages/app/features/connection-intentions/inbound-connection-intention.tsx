import React from "react";
import * as ReactNative from "react-native";

import { cache, Cache } from "app/cache";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { UsersPicker } from "app/components/users-picker";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { styled, Text } from "app/utils/styles";
import { UsersId } from "next-app/src/db/models";

const ActionButton = styled(ReactNative.Button)({
	padding: "md",
	borderWidth: "light",
	borderColor: "border",
});

type UsersResult = TRPCQueryOutput<"users.get-paged">;

const acceptMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.accept",
	ReturnType<typeof cache["accountConnections"]["getAll"]["inbound"]["remove"]>,
	{
		pagedInput: Cache.Users.GetPaged.Input;
		input: Cache.Users.Get.Input;
	}
> = {
	onMutate: (trpcContext) => (variables) =>
		cache.accountConnections.getAll.inbound.remove(
			trpcContext,
			(intention) => intention.accountId === variables.accountId
		),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.accountConnections.getAll.inbound.add(
			trpcContext,
			snapshot.intention,
			snapshot.index
		);
	},
	onSuccess:
		(trpcContext, { input, pagedInput }) =>
		(email, variables) => {
			cache.users.get.update(trpcContext, input, (user) => ({
				...user,
				email,
			}));
			cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				variables.userId,
				(user) => ({
					...user,
					email,
				})
			);
		},
};

const rejectMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.reject",
	ReturnType<typeof cache["accountConnections"]["getAll"]["inbound"]["remove"]>
> = {
	onMutate: (trpcContext) => (variables) =>
		cache.accountConnections.getAll.inbound.remove(
			trpcContext,
			(intention) => intention.accountId === variables.sourceAccountId
		),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.accountConnections.getAll.inbound.add(
			trpcContext,
			snapshot.intention,
			snapshot.index
		);
	},
};

type InnerProps = {
	intention: TRPCQueryOutput<"account-connection-intentions.get-all">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<InnerProps> = ({
	intention,
}) => {
	const usersGetPagedInput = cache.users.getPaged.useStore();
	const usersQuery = trpc.useInfiniteQuery(
		["users.get-paged", usersGetPagedInput],
		{ getNextPageParam: cache.users.getPaged.getNextPage }
	);
	const loadMore = React.useCallback(() => {
		usersQuery.fetchNextPage();
	}, [usersQuery]);
	const [userId, setUserId] = React.useState<UsersId>();
	const availableUsers = usersQuery.data?.pages
		.reduce<UsersResult["items"]>((acc, page) => [...acc, ...page.items], [])
		.filter((user) => !user.email && !user.dirty);
	const selectedUserName =
		availableUsers?.find((user) => user.id === userId)?.name ?? userId;
	React.useEffect(() => {
		if (userId || !availableUsers) {
			return;
		}
		const firstUser = availableUsers[0];
		if (firstUser) {
			setUserId(firstUser.id);
		}
	}, [userId, setUserId, availableUsers]);

	const acceptConnectionMutation = trpc.useMutation(
		"account-connection-intentions.accept",
		useTrpcMutationOptions(acceptMutationOptions, {
			pagedInput: usersGetPagedInput,
			// We can only call that if userId is not null
			input: { id: userId! },
		})
	);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.accountId,
			userId: userId!,
		});
	}, [acceptConnectionMutation, intention.accountId, userId]);

	const rejectConnectionMutation = trpc.useMutation(
		"account-connection-intentions.reject",
		useTrpcMutationOptions(rejectMutationOptions)
	);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.accountId,
		});
	}, [rejectConnectionMutation, intention.accountId]);

	return (
		<Block name={`Inbound connection from ${intention.email}`}>
			{availableUsers ? (
				<>
					<UsersPicker
						users={availableUsers}
						userId={userId}
						onChange={setUserId}
						loadMore={loadMore}
					/>
					<ReactNative.TouchableOpacity>
						<ActionButton
							title={
								userId ? `Accept ${selectedUserName}` : "Please select user"
							}
							disabled={!userId}
							onPress={acceptConnection}
						/>
					</ReactNative.TouchableOpacity>
				</>
			) : null}
			<ReactNative.TouchableOpacity>
				<ActionButton title="Reject connection" onPress={rejectConnection} />
			</ReactNative.TouchableOpacity>
			<MutationWrapper<"account-connection-intentions.accept">
				mutation={acceptConnectionMutation}
			>
				{() => <Text>Accept success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"account-connection-intentions.reject">
				mutation={rejectConnectionMutation}
			>
				{() => <Text>Reject success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
