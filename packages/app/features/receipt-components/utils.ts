import type { Participant } from "~app/hooks/use-participants";
import { compare } from "~utils/date";

import type { Item } from "./state";

export const SORT_USERS = (
	a: Item["consumers"][number] | Participant,
	b: Item["consumers"][number] | Participant,
) => {
	const delta = compare.zonedDateTime(a.createdAt, b.createdAt);
	if (delta === 0) {
		return a.userId.localeCompare(b.userId);
	}
	return delta;
};
