import React from "react";

import { styled } from "@nextui-org/react";

import { UsersSuggest } from "app/components/app/users-suggest";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCInfiniteQueryOutput } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

const Wrapper = styled("div", {
	pb: "$4",
});

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	disabled: boolean;
	filterIds: UsersId[];
};

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	disabled,
	filterIds,
}) => {
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(mutations.receiptParticipants.add.options, {
			context: {
				receiptId,
			},
		})
	);

	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const addParticipants = useAsyncCallback(
		async (
			isMount,
			participant: TRPCInfiniteQueryOutput<"users.suggest">["items"][number]
		) => {
			setLocalFilterIds((prevIds) => [...prevIds, participant.id]);
			try {
				await addMutation.mutateAsync({
					receiptId,
					userIds: [participant.id],
					role: "editor",
				});
			} finally {
				if (isMount()) {
					setLocalFilterIds((prevIds) =>
						prevIds.filter((id) => id !== participant.id)
					);
				}
			}
		},
		[addMutation, receiptId]
	);

	return (
		<Wrapper>
			<UsersSuggest
				filterIds={[...filterIds, ...localFilterIds]}
				onUserClick={addParticipants}
				disabled={disabled || receiptLocked}
				options={React.useMemo(
					() => ({ type: "not-connected-receipt", receiptId }),
					[receiptId]
				)}
				label="Add participants"
			/>
		</Wrapper>
	);
};
