import React from "react";

import { AddButton } from "app/components/add-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import {
	ReceiptItemsGetInput,
	updateReceiptItemPart,
	addReceiptItemPart,
	removeReceiptItemPart,
} from "app/utils/queries/receipt-items-get";
import { Text } from "app/utils/styles";
import { ReceiptItemsId, UsersId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const createItemPart = (
	userId: UsersId
): Parameters<typeof addReceiptItemPart>[3] => ({
	userId,
	dirty: true,
	part: 1,
});

const putMutationOptions: UseContextedMutationOptions<
	"item-participants.put",
	void,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (variables) => {
		addReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			createItemPart(variables.userId)
		);
	},
	onSuccess: (trpcContext, input) => (_value, variables) => {
		updateReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({ ...part, dirty: false })
		);
	},
	onError: (trpcContext, input) => (_error, variables) => {
		removeReceiptItemPart(
			trpcContext,
			input,
			variables.itemId,
			(part) => variables.userId === part.userId
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
