import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { options as itemParticipantsAddOptions } from "~mutations/item-participants/add";

type Props = {
	item: TRPCQueryOutput<"receipts.get">["items"][number];
	participant: TRPCQueryOutput<"receipts.get">["participants"][number];
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ParticipantChip: React.FC<Props> = ({
	item,
	participant,
	receipt,
}) => {
	const addItemPartMutation = trpc.itemParticipants.add.useMutation(
		useTrpcMutationOptions(itemParticipantsAddOptions, {
			context: receipt.id,
		}),
	);
	const addParticipant = React.useCallback(() => {
		addItemPartMutation.mutate({
			itemId: item.id,
			userIds: [participant.userId],
		});
	}, [addItemPartMutation, item.id, participant.userId]);

	return (
		<LoadableUser
			id={participant.userId}
			foreign={receipt.ownerUserId !== receipt.selfUserId}
			className="cursor-pointer"
			onClick={addParticipant}
			chip
		/>
	);
};
