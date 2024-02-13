import React from "react";

import { Chip } from "@nextui-org/react";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { useUserName } from "app/hooks/use-user-name";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];

export const EVERY_PARTICIPANT_TAG = "__ALL__" as const;

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	isOwner: boolean;
	participant: ReceiptParticipant | typeof EVERY_PARTICIPANT_TAG;
	notAddedParticipantIds: [UsersId, ...UsersId[]];
	isDisabled: boolean;
};

export const ParticipantChip: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	isOwner,
	participant,
	notAddedParticipantIds,
	isDisabled,
}) => {
	const addItemPartMutation = trpc.itemParticipants.add.useMutation(
		useTrpcMutationOptions(mutations.itemParticipants.add.options, {
			context: receiptId,
		}),
	);
	const addParticipant = React.useCallback(
		(addedParticipant: ReceiptParticipant | typeof EVERY_PARTICIPANT_TAG) =>
			() => {
				if (addedParticipant === EVERY_PARTICIPANT_TAG) {
					addItemPartMutation.mutate({
						itemId: receiptItemId,
						userIds: notAddedParticipantIds,
					});
				} else {
					addItemPartMutation.mutate({
						itemId: receiptItemId,
						userIds: [addedParticipant.userId],
					});
				}
			},
		[addItemPartMutation, notAddedParticipantIds, receiptItemId],
	);
	const userName = useUserName(
		participant !== EVERY_PARTICIPANT_TAG ? participant.userId : undefined,
		isOwner,
	);

	return (
		<Chip
			color={participant === EVERY_PARTICIPANT_TAG ? "secondary" : "default"}
			className="cursor-pointer"
			onClick={addParticipant(participant)}
			isDisabled={isDisabled}
		>
			{participant === EVERY_PARTICIPANT_TAG ? "Everyone" : `+ ${userName}`}
		</Chip>
	);
};
