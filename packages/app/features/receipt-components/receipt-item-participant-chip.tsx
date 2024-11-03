import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";

import { useActionsHooksContext } from "./context";
import { useIsOwner } from "./hooks";
import type { Item, Participant } from "./state";

type Props = {
	item: Item;
	participant: Participant;
};

export const ReceiptItemParticipantChip: React.FC<Props> = ({
	item,
	participant,
}) => {
	const { addItemPart } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const addParticipant = React.useCallback(() => {
		addItemPart(item.id, participant.userId, 1);
	}, [addItemPart, item.id, participant.userId]);

	return (
		<LoadableUser
			id={participant.userId}
			foreign={!isOwner}
			className="cursor-pointer"
			onClick={addParticipant}
			chip
		/>
	);
};
