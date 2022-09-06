import { t } from "next-app/handlers/trpc";

import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getName } from "./get-name";
import { procedure as getNonResolvedAmount } from "./get-non-resolved-amount";
import { procedure as getPaged } from "./get-paged";
import { procedure as getResolvedParticipants } from "./get-resolved-participants";
import { procedure as propagateDebts } from "./propagate-debts";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";
import { procedure as updateDebt } from "./update-debt";

export const router = t.router({
	get,
	getPaged,
	remove,
	add,
	update,
	getName,
	getResolvedParticipants,
	propagateDebts,
	updateDebt,
	getNonResolvedAmount,
});
