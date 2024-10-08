import React from "react";

import { UsersSuggest } from "~app/components/app/users-suggest";
import { useSelfAccountId } from "~app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { UsersId } from "~db/models";
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
	const selfAccountId = useSelfAccountId();
	const addMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(receiptParticipantsAddOptions, {
			context: { receiptId: receipt.id },
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
				receiptId: receipt.id,
				userIds: [userId],
				role: "editor",
			}),
		[addMutation, receipt.id],
	);

	return (
		<UsersSuggest
			filterIds={[...filterIds, ...localFilterIds]}
			onUserClick={addParticipants}
			isDisabled={
				disabled || Boolean(receipt.transferIntentionUserId) || !selfAccountId
			}
			options={React.useMemo(
				() => ({ type: "not-connected-receipt", receiptId: receipt.id }),
				[receipt.id],
			)}
			label="Add participants"
			{...props}
		/>
	);
};
