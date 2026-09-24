import React from "react";

import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	PeersSuggest,
	SkeletonPeersSuggest,
} from "~app/components/app/peers-suggest";
import { ConfirmModal } from "~app/components/confirm-modal";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { InboundIntention } from "~app/trpc-types";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";
import { options as userConnectionsAcceptOptions } from "~mutations/user-connection-intentions/accept";
import { options as userConnectionsRejectOptions } from "~mutations/user-connection-intentions/reject";

export const SkeletonInboundConnectionIntention = () => {
	const { t } = useTranslation("peers");
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
			<SkeletonPeersSuggest label={t("intentions.peerSuggestLabel")} />
		</View>
	);
};

type Props = {
	intention: InboundIntention;
};

export const InboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const trpc = useTRPC();
	const [peerId, setPeerId] = React.useState<PeerId>();
	const { t } = useTranslation("peers");

	const acceptConnectionMutation = useMutation(
		trpc.userConnectionIntentions.accept.mutationOptions(
			useTrpcMutationOptions(userConnectionsAcceptOptions),
		),
	);
	const acceptConnection = React.useCallback(() => {
		if (!peerId) {
			return;
		}
		acceptConnectionMutation.mutate({
			userId: intention.user.id,
			peerId,
		});
	}, [acceptConnectionMutation, intention.user.id, peerId]);

	const rejectConnectionMutation = useMutation(
		trpc.userConnectionIntentions.reject.mutationOptions(
			useTrpcMutationOptions(userConnectionsRejectOptions),
		),
	);
	const rejectConnection = React.useCallback(() => {
		rejectConnectionMutation.mutate({
			sourceUserId: intention.user.id,
		});
	}, [rejectConnectionMutation, intention.user.id]);

	const peersSuggestOptions = React.useMemo(
		() => ({ type: "not-connected" as const }),
		[],
	);
	const onPeerClick = React.useCallback(
		(openModal: () => void) => (nextPeerId: PeerId) => {
			if (nextPeerId === peerId) {
				setPeerId(undefined);
				return;
			}
			setPeerId(nextPeerId);
			openModal();
		},
		[peerId],
	);
	const peerQuery = useQuery(
		trpc.peers.get.queryOptions(peerId ? { id: peerId } : skipToken),
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
					defaultValue={intention.user.email}
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
				onCancel={() => setPeerId(undefined)}
				isLoading={acceptConnectionMutation.isPending}
				title={t("intentions.modal.title")}
				subtitle={
					peerQuery.data
						? t("intentions.modal.description", {
								email: intention.user.email,
								peerName: peerQuery.data.name,
							})
						: undefined
				}
				confirmText={t("intentions.modal.confirmText")}
			>
				{({ openModal }) => (
					<PeersSuggest
						label={t("intentions.peerSuggestLabel")}
						onPeerClick={onPeerClick(openModal)}
						options={peersSuggestOptions}
						closeOnSelect
					/>
				)}
			</ConfirmModal>
		</View>
	);
};
