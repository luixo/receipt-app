import React from "react";
import { View } from "react-native";

import { skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { UsersSuggest } from "~app/components/app/users-suggest";
import { ConfirmModal } from "~app/components/confirm-modal";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Input } from "~components/input";
import type { UsersId } from "~db/models";
import { options as accountConnectionsAcceptOptions } from "~mutations/account-connection-intentions/accept";
import { options as accountConnectionsRejectOptions } from "~mutations/account-connection-intentions/reject";

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const trpc = useTRPC();
	const [userId, setUserId] = React.useState<UsersId>();

	const acceptConnectionMutation = useMutation(
		trpc.accountConnectionIntentions.accept.mutationOptions(
			useTrpcMutationOptions(accountConnectionsAcceptOptions),
		),
	);
	const acceptConnection = React.useCallback(() => {
		acceptConnectionMutation.mutate({
			accountId: intention.account.id,
			userId: userId || "unset user id",
		});
	}, [acceptConnectionMutation, intention.account.id, userId]);

	const rejectConnectionMutation = useMutation(
		trpc.accountConnectionIntentions.reject.mutationOptions(
			useTrpcMutationOptions(accountConnectionsRejectOptions),
		),
	);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceAccountId: intention.account.id,
		});
	}, [rejectConnectionMutation, intention.account.id]);

	const usersSuggestOptions = React.useMemo(
		() => ({ type: "not-connected" as const }),
		[],
	);
	const onUserClick = React.useCallback(
		(openModal: () => void) => (nextUserId: UsersId) => {
			if (nextUserId === userId) {
				setUserId(undefined);
				return;
			}
			setUserId(nextUserId);
			openModal();
		},
		[userId],
	);
	const userQuery = useQuery(
		trpc.users.get.queryOptions(userId ? { id: userId } : skipToken),
	);

	const isLoading =
		acceptConnectionMutation.isPending || rejectConnectionMutation.isPending;
	return (
		<View className="gap-2">
			<View className="flex flex-row justify-between">
				<Input
					isReadOnly
					className="max-w-xs"
					size="sm"
					defaultValue={intention.account.email}
					label="Email to connect"
					type="email"
					variant="bordered"
				/>
				<Button
					color="warning"
					variant="bordered"
					isDisabled={isLoading}
					onPress={rejectConnection}
				>
					Reject
				</Button>
			</View>
			<ConfirmModal
				onConfirm={acceptConnection}
				onCancel={() => setUserId(undefined)}
				isLoading={acceptConnectionMutation.isPending}
				title="Connect an account"
				subtitle={`This will connect account "${
					intention.account.email
				}" with a user ${userQuery.data ? userQuery.data.name : "(loading..)"}`}
				confirmText="Are you sure?"
			>
				{({ openModal }) => (
					<UsersSuggest
						label="Please choose a user below to accept intention"
						onUserClick={onUserClick(openModal)}
						options={usersSuggestOptions}
						closeOnSelect
					/>
				)}
			</ConfirmModal>
		</View>
	);
};
