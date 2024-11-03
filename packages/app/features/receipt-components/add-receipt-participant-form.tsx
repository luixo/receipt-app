import React from "react";

import { UsersSuggest } from "~app/components/app/users-suggest";
import type { UsersId } from "~db/models";

import { useActionsHooksContext, useReceiptContext } from "./context";

type Props = {
	filterIds: UsersId[];
} & Omit<React.ComponentProps<typeof UsersSuggest>, "onUserClick" | "options">;

export const AddReceiptParticipantForm: React.FC<Props> = ({
	filterIds,
	...props
}) => {
	const { receiptDisabled, participantsDisabled, getUsersSuggestOptions } =
		useReceiptContext();
	const { addParticipant } = useActionsHooksContext();
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);

	const addParticipants = React.useCallback(
		(userId: UsersId) => {
			setLocalFilterIds((prevIds) => [...prevIds, userId]);
			addParticipant(userId, "editor", {
				onSettled: () =>
					setLocalFilterIds((prevIds) => prevIds.filter((id) => id !== userId)),
			});
		},
		[addParticipant],
	);

	return (
		<UsersSuggest
			filterIds={[...filterIds, ...localFilterIds]}
			onUserClick={addParticipants}
			isDisabled={receiptDisabled || participantsDisabled}
			options={React.useMemo(
				() => getUsersSuggestOptions(),
				[getUsersSuggestOptions],
			)}
			label="Add participants"
			{...props}
		/>
	);
};
