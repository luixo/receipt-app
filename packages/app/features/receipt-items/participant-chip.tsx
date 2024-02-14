import React from "react";

import { LoadableUser } from "app/components/app/loadable-user";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	isOwner: boolean;
	participant: TRPCQueryOutput<"receipts.get">["participants"][number];
	isDisabled: boolean;
};

export const ParticipantChip: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	isOwner,
	participant,
	isDisabled,
}) => {
	const addItemPartMutation = trpc.itemParticipants.add.useMutation(
		useTrpcMutationOptions(mutations.itemParticipants.add.options, {
			context: receiptId,
		}),
	);
	const addParticipant = React.useCallback(() => {
		addItemPartMutation.mutate({
			itemId: receiptItemId,
			userIds: [participant.userId],
		});
	}, [addItemPartMutation, receiptItemId, participant]);

	return (
		<LoadableUser
			id={participant.userId}
			foreign={!isOwner}
			className="cursor-pointer"
			onClick={addParticipant}
			chip={{ isDisabled }}
		/>
	);
};
