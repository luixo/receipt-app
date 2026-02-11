import type React from "react";

import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
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

	const ownerUserIds = participants
		.filter((participant) => participant.role === "owner")
		.map(({ userId }) => userId);
	const possibleParticipantIds = participants
		.map(({ userId }) => userId)
		.filter((participantId) => !ownerUserIds.includes(participantId));
	const addedParticipantsIds = item.payers.map(({ userId }) => userId);
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
					? ownerUserIds
					: item.payers.map(({ userId }) => userId)
			}
			disabledKeys={
				addConsumerMutationStates.some(({ status }) => status === "pending") ||
				removeConsumerMutationStates.some(({ status }) => status === "pending")
					? possibleParticipantIds
					: undefined
			}
			onSelectionChange={(nextSelected) => {
				addedParticipantsIds
					.filter((id) => !nextSelected.includes(id))
					.forEach((id) => removeItemPayer(item.id, id));
				nextSelected
					.filter((id) => notAddedParticipantsIds.has(id))
					.forEach((id) => addItemPayer(item.id, id, 1));
			}}
			renderValue={(selectedParticipants) => {
				if (selectedParticipants.length === 1) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const { userId } = selectedParticipants[0]!;
					return (
						<LoadableUser
							key={userId}
							className={canEdit ? "cursor-pointer" : undefined}
							avatarProps={{ size: "sm", dimmed: defaultOwnerOnly }}
							id={userId}
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
							.map((participant) => participant.userId)
							.filter(isNonNullish)
							.map((userId) => (
								<LoadableUser key={userId} id={userId} foreign={!isOwner} />
							))}
					</AvatarGroup>
				);
			}}
			items={participants.toSorted(SORT_USERS)}
			getKey={({ userId }) => userId}
		>
			{({ userId }) => <LoadableUser id={userId} foreign={!isOwner} />}
		</Select>
	);
};
