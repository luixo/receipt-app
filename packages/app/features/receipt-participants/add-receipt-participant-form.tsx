import React from "react";

import { styled } from "@nextui-org/react";

import { UsersSuggest } from "app/components/app/users-suggest";
import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCInfiniteQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptsId, UsersId } from "next-app/db/models";

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
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const selfAccountId = useSelfAccountId();
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(mutations.receiptParticipants.add.options, {
			context: {
				receiptId,
				selfAccountId: selfAccountId || "unknown",
			},
			onMutate: (vars) =>
				setLocalFilterIds((prevIds) => [...prevIds, ...vars.userIds]),
			onSettled: (_res, _err, vars) =>
				setLocalFilterIds((prevIds) =>
					prevIds.filter((id) => !vars.userIds.includes(id)),
				),
		}),
	);

	const addParticipants = React.useCallback(
		async (
			participant: TRPCInfiniteQueryOutput<"users.suggest">["items"][number],
		) =>
			addMutation.mutate({
				receiptId,
				userIds: [participant.id],
				role: "editor",
			}),
		[addMutation, receiptId],
	);

	return (
		<Wrapper>
			<UsersSuggest
				filterIds={[...filterIds, ...localFilterIds]}
				onUserClick={addParticipants}
				isDisabled={disabled || receiptLocked || !selfAccountId}
				options={React.useMemo(
					() => ({ type: "not-connected-receipt", receiptId }),
					[receiptId],
				)}
				label="Add participants"
			/>
		</Wrapper>
	);
};
