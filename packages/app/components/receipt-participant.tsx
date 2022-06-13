import React from "react";
import { trpc, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";
import { RemoveButton } from "./utils/remove-button";
import { MutationWrapper } from "./utils/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";
import {
	getReceiptParticipantWithIndexById,
	updateReceiptParticipants,
} from "../utils/queries/receipt-participants";
import { useAsyncCallback } from "../hooks/use-async-callback";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<typeof getReceiptParticipantWithIndexById>,
	ReceiptItemsGetInput
> = {
	onMutate:
		(trpc, input) =>
		({ userId }) => {
			const removedReceiptParticipant = getReceiptParticipantWithIndexById(
				trpc,
				input,
				userId
			);
			updateReceiptParticipants(trpc, input, (participants) =>
				participants.filter((participant) => participant.userId !== userId)
			);
			return removedReceiptParticipant;
		},
	onError: (trpc, input) => (_error, _variables, removedReceiptParticipant) => {
		if (!removedReceiptParticipant) {
			return;
		}
		updateReceiptParticipants(trpc, input, (participants) => [
			...participants.slice(0, removedReceiptParticipant.index),
			removedReceiptParticipant.item,
			...participants.slice(removedReceiptParticipant.index),
		]);
	},
};

type Props = {
	receiptParticipant: TRPCQueryOutput<"receipt-items.get">["participants"][number];
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const ReceiptParticipant: React.FC<Props> = ({
	receiptParticipant,
	receiptItemsInput,
	role,
}) => {
	const deleteReceiptParticipantMutation = trpc.useMutation(
		"receipt-participants.delete",
		useTrpcMutationOptions(deleteMutationOptions, receiptItemsInput)
	);
	const deleteReceiptParticipant = useAsyncCallback(
		() =>
			deleteReceiptParticipantMutation.mutateAsync({
				receiptId: receiptItemsInput.receiptId,
				userId: receiptParticipant.userId,
			}),
		[
			deleteReceiptParticipantMutation,
			receiptItemsInput.receiptId,
			receiptParticipant.userId,
		]
	);
	return (
		<Block name={`User ${receiptParticipant.name}`}>
			<Text>Role: {receiptParticipant.role}</Text>
			<Text>{receiptParticipant.resolved ? "resolved" : "not resolved"}</Text>
			{role && role === "owner" ? (
				<>
					<RemoveButton onPress={deleteReceiptParticipant}>
						Delete receipt participant
					</RemoveButton>
					<MutationWrapper<"receipt-participants.delete">
						mutation={deleteReceiptParticipantMutation}
					>
						{() => <Text>Delete success!</Text>}
					</MutationWrapper>
				</>
			) : null}
		</Block>
	);
};
