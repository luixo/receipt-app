import React from "react";

import { skipToken } from "@tanstack/react-query";

import { UsersSuggest } from "~app/components/app/users-suggest";
import { useSelfAccountId } from "~app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { ReceiptsId, UsersId } from "~db/models";
import { options as receiptParticipantsAddOptions } from "~mutations/receipt-participants/add";

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	receiptInTransfer: boolean;
	disabled: boolean;
	filterIds: UsersId[];
} & Omit<React.ComponentProps<typeof UsersSuggest>, "onUserClick" | "options">;

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	receiptInTransfer,
	disabled,
	filterIds,
	...props
}) => {
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const selfAccountId = useSelfAccountId();
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(receiptParticipantsAddOptions, {
			context: selfAccountId ? { receiptId, selfAccountId } : skipToken,
			onMutate: (vars) =>
				setLocalFilterIds((prevIds) => [...prevIds, ...vars.userIds]),
			onSettled: (_res, _err, vars) =>
				setLocalFilterIds((prevIds) =>
					prevIds.filter((id) => !vars.userIds.includes(id)),
				),
		}),
	);

	const addParticipants = React.useCallback(
		async (userId: UsersId) =>
			addMutation.mutate({
				receiptId,
				userIds: [userId],
				role: "editor",
			}),
		[addMutation, receiptId],
	);

	return (
		<UsersSuggest
			filterIds={[...filterIds, ...localFilterIds]}
			onUserClick={addParticipants}
			isDisabled={
				disabled || receiptLocked || receiptInTransfer || !selfAccountId
			}
			options={React.useMemo(
				() => ({ type: "not-connected-receipt", receiptId }),
				[receiptId],
			)}
			label="Add participants"
			{...props}
		/>
	);
};
