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

	const allParticipantsIds = participants.map(({ userId }) => userId);
	const addedParticipantsIds = item.payers.map(({ userId }) => userId);
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

	return (
		<Select
			className={className}
			label={t("item.payer.label")}
			placeholder={t("item.payer.placeholder")}
			selectedKeys={item.payers.map(({ userId }) => userId)}
			disabledKeys={
				addConsumerMutationStates.some(({ status }) => status === "pending") ||
				removeConsumerMutationStates.some(({ status }) => status === "pending")
					? allParticipantsIds
					: item.payers.length === 0
						? undefined
						: allParticipantsIds.filter(
								(userId) =>
									!item.payers.some((payer) => payer.userId === userId),
							)
			}
			onSelectionChange={(nextSelected) => {
				addedParticipantsIds
					.filter((id) => !nextSelected.includes(id))
					.forEach((id) => removeItemPayer(item.id, id));
				nextSelected
					.filter((id) => notAddedParticipantsIds.has(id))
					.forEach((id) => addItemPayer(item.id, id, 1));
			}}
			renderValue={(selectedParticipants) => (
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
			)}
			items={participants.toSorted(SORT_USERS)}
			getKey={({ userId }) => userId}
		>
			{({ userId }) => <LoadableUser id={userId} foreign={!isOwner} />}
		</Select>
	);
};
