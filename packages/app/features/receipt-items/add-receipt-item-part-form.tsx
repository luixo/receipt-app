import React from "react";

import { cache, Cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";
import { ReceiptItemsId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

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
		useTrpcMutationOptions(
			cache.itemParticipants.put.mutationOptions,
			receiptItemsInput
		)
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
