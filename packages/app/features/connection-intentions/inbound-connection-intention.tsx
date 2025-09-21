import React from "react";
import { View } from "react-native";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { doNothing } from "remeda";

import {
	SkeletonUsersSuggest,
	UsersSuggest,
} from "~app/components/app/users-suggest";
import { ConfirmModal } from "~app/components/confirm-modal";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationResult, TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Input, SkeletonInput } from "~components/input";
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
					variant="bordered"
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

const ConfirmModalWrapper = suspendedFallback<
	Props & {
		children: (
			opts?: Parameters<
				React.ComponentProps<typeof ConfirmModal>["children"]
			>[0],
		) => React.ReactNode;
		acceptMutation: TRPCMutationResult<"accountConnectionIntentions.accept">;
		userId: UserId;
		resetUserId: () => void;
	}
>(
	({ children, intention, acceptMutation, userId, resetUserId }) => {
		const trpc = useTRPC();
		const { t } = useTranslation("users");
		const acceptConnection = React.useCallback(() => {
			acceptMutation.mutate({ accountId: intention.account.id, userId });
		}, [acceptMutation, intention.account.id, userId]);
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id: userId }),
		);
		return (
			<ConfirmModal
				onConfirm={acceptConnection}
				onCancel={resetUserId}
				isLoading={acceptMutation.isPending}
				title={t("intentions.modal.title")}
				subtitle={t("intentions.modal.description", {
					email: intention.account.email,
					userName: user.name,
				})}
				confirmText={t("intentions.modal.confirmText")}
			>
				{(props) => <>{children(props)}</>}
			</ConfirmModal>
		);
	},
	({ children }) => <>{children()}</>,
);

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
		(openModal?: () => void) => (nextUserId: UserId) => {
			if (nextUserId === userId) {
				setUserId(undefined);
				return;
			}
			if (!openModal) {
				return;
			}
			setUserId(nextUserId);
			openModal();
		},
		[userId],
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
					label={t("intentions.form.email.label")}
					type="email"
					variant="bordered"
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
			{userId ? (
				<ConfirmModalWrapper
					acceptMutation={acceptConnectionMutation}
					intention={intention}
					userId={userId}
					resetUserId={() => setUserId(undefined)}
				>
					{(params) => (
						<UsersSuggest
							label={t("intentions.userSuggestLabel")}
							onUserClick={onUserClick(params?.openModal)}
							options={usersSuggestOptions}
							closeOnSelect
						/>
					)}
				</ConfirmModalWrapper>
			) : (
				<UsersSuggest
					label={t("intentions.userSuggestLabel")}
					onUserClick={doNothing()}
					isDisabled
				/>
			)}
		</View>
	);
};
