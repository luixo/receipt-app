import React from "react";

import { UsersSuggest } from "~app/components/app/users-suggest";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { AccountsId, UsersId } from "~db/models";
import { options as receiptParticipantsAddOptions } from "~mutations/receipt-participants/add";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	disabled: boolean;
	filterIds: UsersId[];
} & Omit<React.ComponentProps<typeof UsersSuggest>, "onUserClick" | "options">;

export const AddReceiptParticipantForm: React.FC<Props> = ({
	receipt,
	disabled,
	filterIds,
	...props
}) => {
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const selfAccountId =
		trpc.account.get.useQuery().data?.account.id ??
		("unknown-account-id" as AccountsId);
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(receiptParticipantsAddOptions, {
			context: { receiptId: receipt.id, selfAccountId },
			onMutate: (vars) =>
				setLocalFilterIds((prevIds) => [...prevIds, vars.userId]),
			onSettled: (_res, _err, vars) =>
				setLocalFilterIds((prevIds) =>
					prevIds.filter((id) => id !== vars.userId),
				),
		}),
	);

	const addParticipants = React.useCallback(
		async (userId: UsersId) =>
			addMutation.mutate({
				receiptId: receipt.id,
				userId,
				role: "editor",
			}),
		[addMutation, receipt.id],
	);

	return (
		<UsersSuggest
			filterIds={[...filterIds, ...localFilterIds]}
			onUserClick={addParticipants}
			isDisabled={disabled || Boolean(receipt.transferIntentionUserId)}
			options={React.useMemo(
				() => ({ type: "not-connected-receipt", receiptId: receipt.id }),
				[receipt.id],
			)}
			label="Add participants"
			{...props}
		/>
	);
};
