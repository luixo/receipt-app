import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";

import { useActionsHooksContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import { ReceiptItemConsumerInput } from "./receipt-item-consumer-input";
import type { Item, Participant } from "./state";

type Props = {
	consumer: Item["consumers"][number];
	item: Item;
	participant: Participant;
	isDisabled: boolean;
};

export const ReceiptItemConsumer: React.FC<Props> = ({
	consumer,
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
			(vars) => vars.userId === consumer.userId && vars.itemId === item.id,
		);
	const isPending = removeMutationState?.status === "pending";
	const removeConsumer = React.useCallback(
		() => removeItemConsumer(item.id, consumer.userId),
		[removeItemConsumer, item.id, consumer.userId],
	);
	const isDisabled = isExternalDisabled || isPending;

	return (
		<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
			<LoadableUser id={participant.userId} foreign={!isOwner} />
			<View className="flex-row gap-2 self-end">
				<ReceiptItemConsumerInput
					consumer={consumer}
					item={item}
					isDisabled={isDisabled}
				/>
				{!canEdit ? null : (
					<RemoveButton
						className="self-end"
						onRemove={removeConsumer}
						mutation={{ isPending }}
						noConfirm
						isIconOnly
					/>
				)}
			</View>
		</View>
	);
};

export const ReceiptItemConsumerSkeleton: React.FC = () => (
	<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
		<SkeletonUser />
		<View className="flex-row gap-2 self-end">
			<Skeleton className="h-7 w-10 rounded-md" />
			<Text>/</Text>
			<Skeleton className="h-7 w-10 rounded-md" />
		</View>
	</View>
);
