import type React from "react";

import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { AvatarGroup } from "~components/avatar";
import { Select } from "~components/select";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import type { Item } from "./state";
import { SORT_USERS } from "./utils";

type Props = {
	item: Item;
	className?: string;
};

export const ReceiptItemPayers: React.FC<Props> = ({ item, className }) => {
	const { t } = useTranslation("receipts");
	const { participants } = useReceiptContext();
	const { addItemPayer, removeItemPayer } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const canEdit = useCanEdit();
	const trpc = useTRPC();

	const ownerPeerIds = participants
		.filter((participant) => participant.role === "owner")
		.map(({ peerId }) => peerId);
	const possibleParticipantIds = participants
		.map(({ peerId }) => peerId)
		.filter((participantId) => !ownerPeerIds.includes(participantId));
	const addedParticipantsIds = item.payers.map(({ peerId }) => peerId);
	const notAddedParticipantsIds = new Set(
		possibleParticipantIds.filter(
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

	const defaultOwnerOnly = item.payers.length === 0;
	return (
		<Select
			className={className}
			label={t("item.payer.label")}
			placeholder={t("item.payer.placeholder")}
			selectedKeys={
				defaultOwnerOnly
					? ownerPeerIds
					: item.payers.map(({ peerId }) => peerId)
			}
			disabledKeys={
				addConsumerMutationStates.some(({ status }) => status === "pending") ||
				removeConsumerMutationStates.some(({ status }) => status === "pending")
					? possibleParticipantIds
					: undefined
			}
			onSelectionChange={(nextSelected) => {
				for (const id of addedParticipantsIds.filter(
					(candidateId) => !nextSelected.includes(candidateId),
				)) {
					removeItemPayer(item.id, id);
				}
				for (const id of nextSelected.filter((candidateId) =>
					notAddedParticipantsIds.has(candidateId),
				)) {
					addItemPayer(item.id, id, 1);
				}
			}}
			renderValue={(selectedParticipants) => {
				if (selectedParticipants.length === 1) {
					// oxlint-disable-next-line typescript/no-non-null-assertion
					const { peerId } = selectedParticipants[0]!;
					return (
						<LoadablePeer
							key={peerId}
							className={canEdit ? "cursor-pointer" : undefined}
							avatarProps={{ size: "sm", dimmed: defaultOwnerOnly }}
							id={peerId}
							foreign={!isOwner}
						/>
					);
				}
				return (
					<AvatarGroup
						className={canEdit ? "cursor-pointer" : undefined}
						size="sm"
					>
						{selectedParticipants
							.map((participant) => participant.peerId)
							.filter(isNonNullish)
							.map((peerId) => (
								<LoadablePeer key={peerId} id={peerId} foreign={!isOwner} />
							))}
					</AvatarGroup>
				);
			}}
			items={participants.toSorted(SORT_USERS)}
			getKey={({ peerId }) => peerId}
		>
			{({ peerId }) => <LoadablePeer id={peerId} foreign={!isOwner} />}
		</Select>
	);
};
