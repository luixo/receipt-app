import React from "react";

import { cache, Cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";
import { ReceiptItemsId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const putMutationOptions: UseContextedMutationOptions<
	"item-participants.put",
	void,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		cache.receiptItems.get.receiptItemPart.add(
			trpcContext,
			input,
			variables.itemId,
			{ userId: variables.userId, dirty: true, part: 1 }
		);
	},
	onSuccess: (trpcContext, input) => (_value, variables) => {
		cache.receiptItems.get.receiptItemPart.update(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({ ...part, dirty: false })
		);
	},
	onError: (trpcContext, input) => (_error, variables) => {
		cache.receiptItems.get.receiptItemPart.remove(
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
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
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
