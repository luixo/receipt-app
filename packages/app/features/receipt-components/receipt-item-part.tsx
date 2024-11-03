import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { options as itemParticipantsRemoveOptions } from "~mutations/item-participants/remove";

import { useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import { ReceiptItemPartInput } from "./receipt-item-part-input";
import type { Item, Participant } from "./state";

type Props = {
	part: Item["parts"][number];
	item: Item;
	participant: Participant;
	isDisabled: boolean;
};

export const ReceiptItemPart: React.FC<Props> = ({
	part,
	item,
	participant,
	isDisabled: isExternalDisabled,
}) => {
	const { receiptId } = useReceiptContext();
	const canEdit = useCanEdit();
	const isOwner = useIsOwner();
	const removeMutation = trpc.itemParticipants.remove.useMutation(
		useTrpcMutationOptions(itemParticipantsRemoveOptions, {
			context: receiptId,
		}),
	);
	const removeItemPart = React.useCallback(
		() =>
			removeMutation.mutate({
				itemId: item.id,
				userId: part.userId,
			}),
		[removeMutation, item.id, part.userId],
	);
	const isDisabled = isExternalDisabled || removeMutation.isPending;

	return (
		<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
			<LoadableUser id={participant.userId} foreign={!isOwner} />
			<View className="flex-row gap-2 self-end">
				<ReceiptItemPartInput part={part} item={item} isDisabled={isDisabled} />
				{!canEdit ? null : (
					<RemoveButton
						className="self-end"
						onRemove={removeItemPart}
						mutation={removeMutation}
						noConfirm
						isIconOnly
					/>
				)}
			</View>
		</View>
	);
};
