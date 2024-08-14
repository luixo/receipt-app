import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import { options as itemParticipantsRemoveOptions } from "~mutations/item-participants/remove";

import { ReceiptItemPartInput } from "./receipt-item-part-input";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipts.get">["participants"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	isOwner: boolean;
	participant: ReceiptParticipant;
	itemPart: ReceiptItemParts[number];
	itemParts: number;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemPart: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	isOwner,
	itemPart,
	itemParts,
	participant,
	readOnly,
	isLoading,
}) => {
	const removeMutation = trpc.itemParticipants.remove.useMutation(
		useTrpcMutationOptions(itemParticipantsRemoveOptions, {
			context: receiptId,
		}),
	);
	const removeItemPart = React.useCallback(
		() =>
			removeMutation.mutate({
				itemId: receiptItemId,
				userId: itemPart.userId,
			}),
		[removeMutation, receiptItemId, itemPart.userId],
	);

	return (
		<View className="items-start justify-between gap-2 min-[500px]:flex-row sm:gap-4">
			<LoadableUser id={participant.userId} foreign={!isOwner} />
			<View className="flex-row gap-2 self-end">
				<ReceiptItemPartInput
					receiptId={receiptId}
					receiptItemId={receiptItemId}
					itemPart={itemPart}
					itemParts={itemParts}
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
