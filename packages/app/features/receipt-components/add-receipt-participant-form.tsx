import React from "react";

import { UsersSuggest } from "~app/components/app/users-suggest";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { AccountsId, UsersId } from "~db/models";
import { options as receiptParticipantsAddOptions } from "~mutations/receipt-participants/add";

import { useReceiptContext } from "./context";

type Props = {
	filterIds: UsersId[];
} & Omit<React.ComponentProps<typeof UsersSuggest>, "onUserClick" | "options">;

export const AddReceiptParticipantForm: React.FC<Props> = ({
	filterIds,
	...props
}) => {
	const { receiptId, receiptDisabled, participantsDisabled } =
		useReceiptContext();
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const selfAccountId =
		trpc.account.get.useQuery().data?.account.id ??
		("unknown-account-id" as AccountsId);
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(receiptParticipantsAddOptions, {
			context: { receiptId, selfAccountId },
			onMutate: (vars) =>
				setLocalFilterIds((prevIds) => [...prevIds, vars.userId]),
			onSettled: (_res, _err, vars) =>
				setLocalFilterIds((prevIds) =>
					prevIds.filter((id) => id !== vars.userId),
				),
		}),
	);

	const addParticipants = React.useCallback(
		(userId: UsersId) =>
			addMutation.mutate({ receiptId, userId, role: "editor" }),
		[addMutation, receiptId],
	);

	return (
		<UsersSuggest
			filterIds={[...filterIds, ...localFilterIds]}
			onUserClick={addParticipants}
			isDisabled={receiptDisabled || participantsDisabled}
			options={React.useMemo(
				() => ({ type: "not-connected-receipt", receiptId }),
				[receiptId],
			)}
			label="Add participants"
			{...props}
		/>
	);
};
