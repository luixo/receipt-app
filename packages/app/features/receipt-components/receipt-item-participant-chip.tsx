import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { options as itemParticipantsAddOptions } from "~mutations/item-participants/add";

import { useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import type { Item, Participant } from "./state";

type Props = {
	item: Item;
	participant: Participant;
};

export const ReceiptItemParticipantChip: React.FC<Props> = ({
	item,
	participant,
}) => {
	const { receiptId } = useReceiptContext();
	const isOwner = useIsOwner();
	const addItemPartMutation = trpc.itemParticipants.add.useMutation(
		useTrpcMutationOptions(itemParticipantsAddOptions, {
			context: receiptId,
		}),
	);
	const addParticipant = React.useCallback(() => {
		addItemPartMutation.mutate({
			itemId: item.id,
			userId: participant.userId,
			part: 1,
		});
	}, [addItemPartMutation, item.id, participant.userId]);

	return (
		<LoadableUser
			id={participant.userId}
			foreign={!isOwner}
			className="cursor-pointer"
			onClick={addParticipant}
			chip
		/>
	);
};
