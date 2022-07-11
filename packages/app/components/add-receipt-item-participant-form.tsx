import React from "react";
import { ReceiptItemsId } from "next-app/db/models";
import { AddButton } from "./utils/add-button";
import { Text } from "../utils/styles";
import { trpc, TRPCQueryOutput } from "../trpc";
import { ReceiptItemsGetInput } from "../utils/queries/receipt-items";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { MutationWrapper } from "./utils/mutation-wrapper";
import {
	updateItemPart,
	updateItemParts,
} from "../utils/queries/item-participants";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const putMutationOptions: UseContextedMutationOptions<
	"item-participants.put",
	void,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (variables) => {
		updateItemParts(trpcContext, input, variables.itemId, (parts) => [
			...parts,
			{
				userId: variables.userId,
				dirty: true,
				part: 1,
			},
		]);
	},
	onSuccess: (trpcContext, input) => (_value, variables) => {
		updateItemPart(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({
				...part,
				dirty: false,
			})
		);
	},
	onError: (trpcContext, input) => (_error, variables) => {
		updateItemParts(trpcContext, input, variables.itemId, (parts) =>
			parts.filter((part) => variables.userId !== part.userId)
		);
	},
};

type Props = {
	itemId: ReceiptItemsId;
	participant: ReceiptParticipant;
	receiptItemsInput: ReceiptItemsGetInput;
	role?: TRPCQueryOutput<"receipts.get">["role"];
};

export const AddReceiptItemPartForm: React.FC<Props> = ({
	receiptItemsInput,
	participant,
	itemId,
	role,
}) => {
	const addItemPartMutation = trpc.useMutation(
		"item-participants.put",
		useTrpcMutationOptions(putMutationOptions, receiptItemsInput)
	);
	const addParticipant = React.useCallback(() => {
		addItemPartMutation.mutate({
			itemId,
			userId: participant.userId,
		});
	}, [addItemPartMutation, itemId, participant.userId]);

	return (
		<>
			<AddButton
				key={participant.userId}
				onPress={addParticipant}
				disabled={!role || role === "viewer"}
			>
				{participant.name}
			</AddButton>
			<MutationWrapper<"item-participants.put"> mutation={addItemPartMutation}>
				{() => <Text>Put success!</Text>}
			</MutationWrapper>
		</>
	);
};
