import type React from "react";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { LoadablePeerAvatar } from "~app/components/app/loadable-peer-avatar";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { AvatarGroup } from "~components/avatar";
import { Select } from "~components/select";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import type { Item } from "./state";
import { SORT_USERS } from "./utils";

type Props = {
	item: Item;
	className?: string;
};

export const ReceiptItemConsumers: React.FC<Props> = ({ item, className }) => {
	const { t } = useTranslation("receipts");
	const { participants } = useReceiptContext();
	const { addItemConsumer, removeItemConsumer } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const canEdit = useCanEdit();
	const trpc = useTRPC();

	const allParticipantsIds = participants.map(({ peerId }) => peerId);
	const addedParticipantsIds = item.consumers.map(({ peerId }) => peerId);
	const notAddedParticipantsIds = new Set(
		allParticipantsIds.filter(
			(participantId) => !addedParticipantsIds.includes(participantId),
		),
	);

	const addConsumerMutationStates =
		useTrpcMutationStates<"receiptItemConsumers.add">(
			trpc.receiptItemConsumers.add.mutationKey(),
			({ itemId }) => itemId === item.id,
		);
	const removeConsumerMutationStates =
		useTrpcMutationStates<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove.mutationKey(),
			({ itemId }) => itemId === item.id,
		);

	const peerNames = useQueries({
		queries: participants.map(({ peerId }) =>
			isOwner
				? trpc.peers.get.queryOptions({ id: peerId })
				: trpc.peers.getForeign.queryOptions({ id: peerId }),
		),
		combine: (queries) =>
			queries.reduce<Record<PeerId, string>>(
				(acc, { data }) =>
					data
						? {
								...acc,
								["remoteId" in data ? data.remoteId : data.id]: data.name,
							}
						: acc,
				{},
			),
	});

	return (
		<Select
			className={className}
			label={t("item.consumer.label")}
			placeholder={t("item.consumer.placeholder")}
			selectionMode="multiple"
			selectedKeys={addedParticipantsIds}
			disabledKeys={[
				...addConsumerMutationStates
					.filter((state) => state.status === "pending")
					.map((variables) => variables.variables?.peerId),
				...removeConsumerMutationStates
					.filter((state) => state.status === "pending")
					.map((variables) => variables.variables?.peerId),
			].filter(isNonNullish)}
			renderValue={(selectedParticipants) => {
				const peerIds = selectedParticipants
					.map((participant) => participant.peerId)
					.filter(isNonNullish);
				return (
					<View className="flex-row items-center gap-2">
						<AvatarGroup
							className={canEdit ? "cursor-pointer" : undefined}
							size="sm"
							max={3}
						>
							{peerIds.map((peerId) => (
								<LoadablePeerAvatar
									key={peerId}
									id={peerId}
									foreign={!isOwner}
								/>
							))}
						</AvatarGroup>
						<Text className="text-nowrap">
							{t("item.consumer.group", {
								consumers: peerIds
									.map((peerId) => peerNames[peerId])
									.filter(isNonNullish),
							})}
						</Text>
					</View>
				);
			}}
			onSelectionChange={(nextSelected) => {
				for (const id of addedParticipantsIds.filter(
					(candidateId) => !nextSelected.includes(candidateId),
				)) {
					removeItemConsumer(item.id, id);
				}
				for (const id of nextSelected.filter((candidateId) =>
					notAddedParticipantsIds.has(candidateId),
				)) {
					addItemConsumer(item.id, id, 1);
				}
			}}
			items={participants.toSorted(SORT_USERS)}
			getKey={({ peerId }) => peerId}
		>
			{({ peerId }) => <LoadablePeer id={peerId} foreign={!isOwner} />}
		</Select>
	);
};
