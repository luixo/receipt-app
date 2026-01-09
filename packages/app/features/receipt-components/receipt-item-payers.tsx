import type React from "react";

import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { AvatarGroup } from "~components/avatar";
import { Select, SelectItem } from "~components/select";
import { cn } from "~components/utils";
import type { UserId } from "~db/ids";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import type { Item } from "./state";
import { SORT_USERS } from "./utils";

type Props = {
	item: Item;
} & Omit<
	React.ComponentProps<typeof Select>,
	"items" | "selectedKeys" | "disabledKeys" | "children"
>;

export const ReceiptItemPayers: React.FC<Props> = ({ item, ...props }) => {
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
			aria-label={t("item.payer.label")}
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
			onSelectionChange={(selection) => {
				const nextSelected = (
					selection === "all" ? allParticipantsIds : [...selection.values()]
				) as UserId[];
				addedParticipantsIds
					.filter((id) => !nextSelected.includes(id))
					.forEach((id) => removeItemPayer(item.id, id));
				nextSelected
					.filter((id) => notAddedParticipantsIds.has(id))
					.forEach((id) => addItemPayer(item.id, id, 1));
			}}
			renderValue={(selectedParticipants) => (
				<AvatarGroup
					className={cn("ml-2", canEdit ? "cursor-pointer" : undefined)}
					size="sm"
				>
					{selectedParticipants
						.map((participant) => participant.data?.userId)
						.filter(isNonNullish)
						.map((userId) => (
							<LoadableUser key={userId} id={userId} foreign={!isOwner} />
						))}
				</AvatarGroup>
			)}
			items={participants.toSorted(SORT_USERS)}
			{...props}
		>
			{({ userId }) => (
				<SelectItem key={userId} textValue={userId}>
					<LoadableUser id={userId} foreign={!isOwner} />
				</SelectItem>
			)}
		</Select>
	);
};
