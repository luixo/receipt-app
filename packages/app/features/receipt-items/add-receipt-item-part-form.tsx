import React from "react";

import { cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

type Props = {
	receiptId: ReceiptsId;
	itemId: ReceiptItemsId;
	participant: ReceiptParticipant;
	role: Role;
};

export const AddReceiptItemPartForm: React.FC<Props> = ({
	receiptId,
	participant,
	itemId,
	role,
}) => {
	const addItemPartMutation = trpc.useMutation(
		"item-participants.put",
		useTrpcMutationOptions(
			cache.itemParticipants.put.mutationOptions,
			receiptId
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
				disabled={role === "viewer"}
			>
				{participant.name}
			</AddButton>
			<MutationWrapper<"item-participants.put"> mutation={addItemPartMutation}>
				{() => <Text>Put success!</Text>}
			</MutationWrapper>
		</>
	);
};
