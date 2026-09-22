import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import type { AccountId, PeerId } from "~db/ids";
import { options as accountConnectionsAddOptions } from "~mutations/account-connection-intentions/add";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";
import { options as peersUnlinkOptions } from "~mutations/peers/unlink";

type Props = {
	id: PeerId;
	isLoading: boolean;
};

export const PeerConnectionInput: React.FC<Props> = suspendedFallback(
	({ isLoading, id }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data: peer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id }),
		);
		const { data: connectionIntentions } = useSuspenseQuery(
			trpc.accountConnectionIntentions.getAll.queryOptions(),
		);
		const outboundConnectionIntention =
			connectionIntentions.outbound.find(
				(element) => element.peer.id === peer.id,
			) ?? null;

		const connectPeerMutation = useMutation(
			trpc.accountConnectionIntentions.add.mutationOptions(
				useTrpcMutationOptions(accountConnectionsAddOptions),
			),
		);

		const form = useAppForm({
			defaultValues: { value: peer.connectedAccount?.email ?? "" },
			validators: { onChange: z.object({ value: emailSchema }) },
			onSubmit: ({ value }) => {
				connectPeerMutation.mutate({
					peerId: peer.id,
					email: value.value,
				});
			},
		});
		const [inputShown, setInputShown] = React.useState(
			Boolean(peer.connectedAccount),
		);

		const cancelRequestMutation = useMutation(
			trpc.accountConnectionIntentions.remove.mutationOptions(
				useTrpcMutationOptions(accountConnectionsRemoveOptions, {
					onSuccess: () => {
						form.reset();
						setInputShown(false);
					},
				}),
			),
		);
		const cancelRequest = React.useCallback(
			(accountId: AccountId) =>
				cancelRequestMutation.mutate({ targetAccountId: accountId }),
			[cancelRequestMutation],
		);

		const unlinkMutation = useMutation(
			trpc.peers.unlink.mutationOptions(
				useTrpcMutationOptions(peersUnlinkOptions),
			),
		);
		const unlinkPeer = React.useCallback(
			() => unlinkMutation.mutate({ id: peer.id }),
			[unlinkMutation, peer.id],
		);

		if (outboundConnectionIntention) {
			return (
				<Input
					label={t("peer.connection.outbound.label")}
					value={outboundConnectionIntention.account.email}
					isReadOnly
					mutation={cancelRequestMutation}
					endContent={
						<Button
							title={t("peer.connection.cancel.title")}
							variant="light"
							isLoading={cancelRequestMutation.isPending}
							color="danger"
							isIconOnly
							onPress={() =>
								cancelRequest(outboundConnectionIntention.account.id)
							}
						>
							<Icon name="trash" className="size-6" />
						</Button>
					}
				/>
			);
		}

		if (!inputShown) {
			return (
				<Button
					color="primary"
					onPress={() => setInputShown(true)}
					isDisabled={isLoading}
				>
					{t("peer.connection.connect")}
				</Button>
			);
		}

		return (
			<form.AppField name="value">
				{(field) => (
					<field.TextField
						value={field.state.value}
						onValueChange={field.setValue}
						name={field.name}
						onBlur={field.handleBlur}
						fieldError={
							field.state.meta.isDirty ? field.state.meta.errors : undefined
						}
						label={t("peer.connection.email.label")}
						mutation={[connectPeerMutation, unlinkMutation]}
						isDisabled={isLoading}
						isReadOnly={Boolean(peer.connectedAccount)}
						endContent={
							<form.Subscribe selector={(state) => state.canSubmit}>
								{(canSubmit) =>
									peer.connectedAccount ? (
										<Button
											title={t("peer.connection.unlink.title")}
											variant="light"
											isLoading={unlinkMutation.isPending}
											isIconOnly
											onPress={unlinkPeer}
										>
											<Icon name="unlink" className="size-6" />
										</Button>
									) : (
										<Button
											title={t("peer.connection.link.title")}
											variant="light"
											isLoading={connectPeerMutation.isPending}
											isDisabled={!canSubmit}
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isIconOnly
										>
											<Icon name="link" className="size-6" />
										</Button>
									)
								}
							</form.Subscribe>
						}
					/>
				)}
			</form.AppField>
		);
	},
	() => {
		const { t } = useTranslation("peers");
		return <SkeletonInput label={t("peer.connection.email.label")} />;
	},
);
