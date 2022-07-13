import React from "react";

import { AddButton } from "app/components/utils/add-button";
import { MutationWrapper } from "app/components/utils/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import {
	updateItemPart,
	updateItemParts,
} from "app/utils/queries/item-participants";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import { Text } from "app/utils/styles";
import { ReceiptItemsId } from "next-app/db/models";

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
