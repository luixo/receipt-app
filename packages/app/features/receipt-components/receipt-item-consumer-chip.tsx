import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";

import { useActionsHooksContext } from "./context";
import { useIsOwner } from "./hooks";
import type { Item, Participant } from "./state";

type Props = {
	item: Item;
	participant: Participant;
};

export const ReceiptItemConsumerChip: React.FC<Props> = ({
	item,
	participant,
}) => {
	const { addItemConsumer } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const addConsumer = React.useCallback(() => {
		addItemConsumer(item.id, participant.userId, 1);
	}, [addItemConsumer, item.id, participant.userId]);

	return (
		<LoadableUser
			id={participant.userId}
			foreign={!isOwner}
			className="cursor-pointer"
			onClick={addConsumer}
			chip
		/>
	);
};
