import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";

import { useActionsHooksContext } from "./context";
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
	const { removeItemConsumer } = useActionsHooksContext();
	const canEdit = useCanEdit();
	const isOwner = useIsOwner();
	const removeMutationState =
		useTrpcMutationState<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove,
			(vars) => vars.userId === part.userId && vars.itemId === item.id,
		);
	const isPending = removeMutationState?.status === "pending";
	const removeItemPart = React.useCallback(
		() => removeItemConsumer(item.id, part.userId),
		[removeItemConsumer, item.id, part.userId],
	);
	const isDisabled = isExternalDisabled || isPending;

	return (
		<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
			<LoadableUser id={participant.userId} foreign={!isOwner} />
			<View className="flex-row gap-2 self-end">
				<ReceiptItemPartInput part={part} item={item} isDisabled={isDisabled} />
				{!canEdit ? null : (
					<RemoveButton
						className="self-end"
						onRemove={removeItemPart}
						mutation={{ isPending }}
						noConfirm
						isIconOnly
					/>
				)}
			</View>
		</View>
	);
};
