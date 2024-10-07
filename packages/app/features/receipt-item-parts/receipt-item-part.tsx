import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { options as itemParticipantsRemoveOptions } from "~mutations/item-participants/remove";

import { ReceiptItemPartInput } from "./receipt-item-part-input";

type Receipt = TRPCQueryOutput<"receipts.get">;
type ReceiptItem = Receipt["items"][number];
type ReceiptParticipant = Receipt["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	part: ReceiptItemParts[number];
	item: ReceiptItem;
	participant: ReceiptParticipant;
	receipt: Receipt;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemPart: React.FC<Props> = ({
	part,
	item,
	participant,
	receipt,
	readOnly,
	isLoading,
}) => {
	const removeMutation = trpc.itemParticipants.remove.useMutation(
		useTrpcMutationOptions(itemParticipantsRemoveOptions, {
			context: receipt.id,
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

	return (
		<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
			<LoadableUser
				id={participant.userId}
				foreign={receipt.ownerUserId !== receipt.selfUserId}
			/>
			<View className="flex-row gap-2 self-end">
				<ReceiptItemPartInput
					part={part}
					item={item}
					receipt={receipt}
					readOnly={readOnly}
					isLoading={isLoading || removeMutation.isPending}
				/>
				{readOnly ? null : (
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
