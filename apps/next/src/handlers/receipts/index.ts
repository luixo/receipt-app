import { t } from "next-app/handlers/trpc";

import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getNonResolvedAmount } from "./get-non-resolved-amount";
import { procedure as getPaged } from "./get-paged";
import { procedure as getResolvedParticipants } from "./get-resolved-participants";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = t.router({
	get,
	getPaged,
	remove,
	add,
	update,
	getResolvedParticipants,
	getNonResolvedAmount,
});
