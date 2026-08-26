import React from "react";

import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	SkeletonUsersSuggest,
	UsersSuggest,
} from "~app/components/app/users-suggest";
import { ConfirmModal } from "~app/components/confirm-modal";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import type { UserId } from "~db/ids";
import { options as accountConnectionsAcceptOptions } from "~mutations/account-connection-intentions/accept";
import { options as accountConnectionsRejectOptions } from "~mutations/account-connection-intentions/reject";

export const SkeletonInboundConnectionIntention = () => {
	const { t } = useTranslation("users");
	return (
		<View className="gap-2">
			<View className="flex flex-row justify-between">
				<SkeletonInput
					className="max-w-xs"
					size="sm"
					label={t("intentions.form.email.label")}
					skeletonClassName="w-48"
				/>
				<Button color="warning" variant="bordered" isDisabled>
					{t("intentions.form.rejectButton")}
				</Button>
			</View>
			<SkeletonUsersSuggest label={t("intentions.userSuggestLabel")} />
		</View>
	);
};

type Props = {
	intention: TRPCQueryOutput<"accountConnectionIntentions.getAll">["inbound"][number];
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const trpc = useTRPC();
	const [userId, setUserId] = React.useState<UserId>();
	const { t } = useTranslation("users");

	const acceptConnectionMutation = useMutation(
		trpc.accountConnectionIntentions.accept.mutationOptions(
			useTrpcMutationOptions(accountConnectionsAcceptOptions),
		),
	);
	const acceptConnection = React.useCallback(() => {
		if (!userId) {
			return;
		}
		acceptConnectionMutation.mutate({
			accountId: intention.account.id,
			userId,
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
		(openModal: () => void) => (nextUserId: UserId) => {
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
		<View testID="inbound-connection-intention" className="gap-2">
			<View className="flex flex-row justify-between">
				<Input
					isReadOnly
					className="max-w-xs"
					size="sm"
					defaultValue={intention.account.email}
					label={t("intentions.form.email.label")}
					type="email"
				/>
				<Button
					color="warning"
					variant="bordered"
					isDisabled={isLoading}
					onPress={rejectConnection}
				>
					{t("intentions.form.rejectButton")}
				</Button>
			</View>
			<ConfirmModal
				onConfirm={acceptConnection}
				onCancel={() => setUserId(undefined)}
				isLoading={acceptConnectionMutation.isPending}
				title={t("intentions.modal.title")}
				subtitle={
					userQuery.data
						? t("intentions.modal.description", {
								email: intention.account.email,
								userName: userQuery.data.name,
							})
						: undefined
				}
				confirmText={t("intentions.modal.confirmText")}
			>
				{({ openModal }) => (
					<UsersSuggest
						label={t("intentions.userSuggestLabel")}
						onUserClick={onUserClick(openModal)}
						options={usersSuggestOptions}
						closeOnSelect
					/>
				)}
			</ConfirmModal>
		</View>
	);
};
