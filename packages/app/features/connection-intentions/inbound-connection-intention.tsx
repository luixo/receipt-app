import React from "react";
import * as ReactNative from "react-native";

import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { UsersPicker } from "app/components/users-picker";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import {
	getInboundIntention,
	updateInboundIntentions,
} from "app/utils/queries/account-connection-intentions-get-all";
import { updateUser, UsersGetInput } from "app/utils/queries/users-get";
import {
	DEFAULT_INPUT,
	updatePagedUsers,
	UsersGetPagedInput,
	usersGetPagedNextPage,
} from "app/utils/queries/users-get-paged";
import { styled, Text } from "app/utils/styles";
import { UsersId } from "next-app/src/db/models";

const ActionButton = styled(ReactNative.Button)({
	padding: "$m",
	borderWidth: "$hairline",
	borderColor: "$muted",
});

type UsersResult = TRPCQueryOutput<"users.get-paged">;

const acceptMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.accept",
	ReturnType<typeof getInboundIntention>,
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate: (trpcContext) => (variables) => {
		const intentionSnapshot = getInboundIntention(
			trpcContext,
			variables.accountId
		);
		updateInboundIntentions(trpcContext, (intentions) =>
			intentions.filter(
				(intention) => intention.accountId !== variables.accountId
			)
		);
		return intentionSnapshot;
	},
	onError: (trpcContext) => (_error, _variables, intentionSnapshot) => {
		if (!intentionSnapshot) {
			return;
		}
		updateInboundIntentions(trpcContext, (intentions) => [
			...intentions.slice(0, intentionSnapshot.index),
			intentionSnapshot.intention,
			...intentions.slice(intentionSnapshot.index),
		]);
	},
	onSuccess:
		(trpcContext, { input, pagedInput }) =>
		(email, variables) => {
			updateUser(trpcContext, input, (user) => ({
				...user,
				email,
				dirty: false,
			}));
			updatePagedUsers(trpcContext, pagedInput, (page) =>
				page.map((user) =>
					variables.userId === user.id ? { ...user, email, dirty: false } : user
				)
			);
		},
};

const rejectMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.reject",
	ReturnType<typeof getInboundIntention>
> = {
	onMutate: (trpcContext) => (variables) => {
		const intentionSnapshot = getInboundIntention(
			trpcContext,
			variables.sourceAccountId
		);
		updateInboundIntentions(trpcContext, (intentions) =>
			intentions.filter(
				(intention) => intention.accountId !== variables.sourceAccountId
			)
		);
		return intentionSnapshot;
	},
	onError: (trpcContext) => (_error, _variables, intentionSnapshot) => {
		if (!intentionSnapshot) {
			return;
		}
		updateInboundIntentions(trpcContext, (intentions) => [
			...intentions.slice(0, intentionSnapshot.index),
			intentionSnapshot.intention,
			...intentions.slice(intentionSnapshot.index),
		]);
	},
};

type InnerProps = {
	intention: TRPCQueryOutput<"account-connection-intentions.get-all">["inbound"][number];
	pagedInput: UsersGetPagedInput;
};

export const InboundConnectionIntention: React.FC<InnerProps> = ({
	intention,
	pagedInput,
}) => {
	const usersQuery = trpc.useInfiniteQuery(["users.get-paged", DEFAULT_INPUT], {
		getNextPageParam: usersGetPagedNextPage,
	});
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
			pagedInput,
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
