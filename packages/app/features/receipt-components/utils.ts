import type { Participant } from "~app/hooks/use-participants";

import type { Item } from "./state";

export const SORT_USERS = (
	a: Item["consumers"][number] | Participant,
	b: Item["consumers"][number] | Participant,
) => {
	const delta = Temporal.ZonedDateTime.compare(a.createdAt, b.createdAt);
	if (delta === 0) {
		return a.peerId.localeCompare(b.peerId);
	}
	return delta;
};
