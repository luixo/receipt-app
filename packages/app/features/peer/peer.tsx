import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { PageHeader } from "~app/components/page-header";
import {
	RemoveButton,
	SkeletonRemoveButton,
} from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { peerNameSchema } from "~app/utils/validation";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SaveButton } from "~components/save-button";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";
import { options as peersRemoveOptions } from "~mutations/peers/remove";
import { options as peersUpdateOptions } from "~mutations/peers/update";

import { PeerConnectionInput } from "./peer-connection-input";
import { PeerReceipts } from "./peer-receipts";

type NameProps = {
	id: PeerId;
	isLoading: boolean;
};

const PeerNameInput = suspendedFallback<NameProps>(
	({ isLoading, id }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data: peer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id }),
		);
		const updatePeerMutation = useMutation(
			trpc.peers.update.mutationOptions(
				useTrpcMutationOptions(peersUpdateOptions),
			),
		);
		const form = useAppForm({
			defaultValues: { value: peer.name },
			validators: { onChange: z.object({ value: peerNameSchema }) },
			onSubmit: ({ value }) => {
				updatePeerMutation.mutate({
					id: peer.id,
					update: { type: "name", name: value.value },
				});
			},
		});

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
						label={t("peer.name.label")}
						mutation={updatePeerMutation}
						isDisabled={isLoading}
						endContent={
							peer.name === field.state.value ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title={t("peer.name.save.title")}
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isLoading={updatePeerMutation.isPending}
											isDisabled={isLoading || !canSubmit}
										/>
									)}
								</form.Subscribe>
							)
						}
					/>
				)}
			</form.AppField>
		);
	},
	() => {
		const { t } = useTranslation("peers");
		return <SkeletonInput label={t("peer.name.label")} />;
	},
);

type PublicNameProps = {
	id: PeerId;
	isLoading: boolean;
};

const PeerPublicNameInput = suspendedFallback<PublicNameProps>(
	({ isLoading, id }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data: peer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id }),
		);
		const [showInput, { setTrue: setInput, setFalse: unsetInput }] =
			useBooleanState(peer.publicName !== undefined);

		const updatePeerMutation = useMutation(
			trpc.peers.update.mutationOptions(
				useTrpcMutationOptions(peersUpdateOptions),
			),
		);
		const form = useAppForm({
			defaultValues: { value: peer.publicName ?? null },
			validators: {
				onChange: z.object({ value: peerNameSchema.or(z.null()) }),
			},
			onSubmit: ({ value }) => {
				if (value.value === null && peer.publicName === undefined) {
					unsetInput();
					return;
				}
				updatePeerMutation.mutate({
					id: peer.id,
					update: { type: "publicName", publicName: value.value ?? undefined },
				});
			},
		});

		if (!showInput) {
			return (
				<Button
					color="primary"
					isDisabled={updatePeerMutation.isPending || isLoading}
					onPress={setInput}
				>
					{t("peer.publicName.add")}
				</Button>
			);
		}

		return (
			<form.AppField name="value">
				{(field) => (
					<field.TextField
						value={field.state.value ?? ""}
						onValueChange={field.setValue}
						name={field.name}
						onBlur={field.handleBlur}
						fieldError={
							field.state.meta.isDirty ? field.state.meta.errors : undefined
						}
						label={t("peer.publicName.label")}
						mutation={updatePeerMutation}
						isDisabled={isLoading}
						endContent={
							<View className="flex gap-2">
								{peer.publicName === (field.state.value ?? undefined) ? null : (
									<form.Subscribe selector={(state) => state.canSubmit}>
										{(canSubmit) => (
											<SaveButton
												title={t("peer.publicName.save.title")}
												onPress={() => {
													void field.form.handleSubmit();
												}}
												isLoading={updatePeerMutation.isPending}
												isDisabled={isLoading || !canSubmit}
											/>
										)}
									</form.Subscribe>
								)}
								{peer.publicName === undefined ? null : (
									<Button
										title={t("peer.publicName.remove.title")}
										variant="light"
										isLoading={updatePeerMutation.isPending}
										onPress={() => {
											field.setValue(null);
											void field.form.handleSubmit();
										}}
										color="danger"
										isIconOnly
									>
										<Icon name="trash" className="size-6" />
									</Button>
								)}
							</View>
						}
					/>
				)}
			</form.AppField>
		);
	},
	() => {
		const { t } = useTranslation("peers");
		return <SkeletonInput label={t("peer.publicName.label")} />;
	},
);

type RemoveProps = {
	id: PeerId;
	setLoading: (nextLoading: boolean) => void;
	onSuccess?: () => void;
} & Omit<
	React.ComponentProps<typeof RemoveButton>,
	"mutation" | "onRemove" | "subtitle"
>;

const PeerRemoveButton = suspendedFallback<RemoveProps>(
	({ setLoading, onSuccess, id, ...props }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data: peer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id }),
		);
		const removePeerMutation = useMutation(
			trpc.peers.remove.mutationOptions(
				useTrpcMutationOptions(peersRemoveOptions, { onSuccess }),
			),
		);
		React.useEffect(
			() => setLoading(removePeerMutation.isPending),
			[removePeerMutation.isPending, setLoading],
		);
		const removePeer = React.useCallback(
			() => removePeerMutation.mutate({ id: peer.id }),
			[removePeerMutation, peer.id],
		);

		return (
			<RemoveButton
				mutation={removePeerMutation}
				onRemove={removePeer}
				subtitle={t("peer.remove.subtitle")}
				{...props}
			/>
		);
	},
	({ className, children }) => (
		<SkeletonRemoveButton className={className}>
			{children}
		</SkeletonRemoveButton>
	),
);

export const Peer: React.FC<{ id: PeerId; onRemove: () => void }> = ({
	id,
	onRemove,
}) => {
	const { t } = useTranslation("peers");
	const [deleteLoading, setDeleteLoading] = React.useState(false);

	return (
		<>
			<PageHeader
				startContent={<BackLink to="/peers" />}
				endContent={<LoadablePeer id={id} />}
			/>
			<PeerNameInput id={id} isLoading={deleteLoading} />
			<PeerPublicNameInput id={id} isLoading={deleteLoading} />
			<PeerConnectionInput id={id} isLoading={deleteLoading} />
			<PeerReceipts peerId={id} />
			<PeerRemoveButton
				id={id}
				className="self-end"
				setLoading={setDeleteLoading}
				onSuccess={onRemove}
			>
				{t("peer.remove.button")}
			</PeerRemoveButton>
		</>
	);
};
