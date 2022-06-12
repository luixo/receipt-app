import React from "react";
import { trpc, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { ReceiptItemPart } from "./receipt-item-part";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import {
	getReceiptItemWithIndexById,
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "../utils/queries/receipt-items";
import { RemoveButton } from "./utils/remove-button";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { Text } from "../utils/styles";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-items.delete",
	ReturnType<typeof getReceiptItemWithIndexById>,
	ReceiptItemsGetInput
> = {
	onMutate:
		(trpc, input) =>
		({ id: removedId }) => {
			const removedItem = getReceiptItemWithIndexById(trpc, input, removedId);
			updateReceiptItems(trpc, input, (items) =>
				items.filter((item) => item.id !== removedId)
			);
			return removedItem;
		},
	onError: (trpc, input) => (_error, _variables, removedItem) => {
		if (!removedItem) {
			return;
		}
		updateReceiptItems(trpc, input, (items) => [
			...items.slice(0, removedItem.index),
			removedItem.item,
			...items.slice(removedItem.index),
		]);
	},
};

type Props = {
	receiptItem: ReceiptItem;
	receiptParticipants: ReceiptParticipant[];
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const ReceiptItem: React.FC<Props> = ({
	receiptItem,
	receiptParticipants,
	receiptItemsInput,
	role,
}) => {
	const removeReceiptItemMutation = trpc.useMutation(
		"receipt-items.delete",
		useTrpcMutationOptions(deleteMutationOptions, receiptItemsInput)
	);
	const removeReceiptItem = React.useCallback(() => {
		removeReceiptItemMutation.mutate({ id: receiptItem.id });
	}, [removeReceiptItemMutation.mutate, receiptItem.id]);

	return (
		<Block name={receiptItem.name}>
			<Text>
				<Text>{receiptItem.price}</Text>
				{" x "}
				<Text>{receiptItem.quantity}</Text>
			</Text>
			<Text>{receiptItem.locked ? "locked" : "not locked"}</Text>
			{!role || role === "viewer" ? null : (
				<RemoveButton onPress={removeReceiptItem}>Remove item</RemoveButton>
			)}
			{receiptItem.parts.map((part) => (
				<ReceiptItemPart
					key={part.userId}
					receiptItemPart={part}
					receiptParticipants={receiptParticipants}
				/>
			))}
			<MutationWrapper<"receipt-items.delete">
				mutation={removeReceiptItemMutation}
			>
				{() => <Text>Delete success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
