import { getUpdaters } from "../utils";

import * as get from "./get";
import * as getAll from "./get-all";
import * as getAllUser from "./get-all-user";
import * as getByUsers from "./get-by-users";
import * as getIdsByUser from "./get-ids-by-user";
import * as getIntentions from "./get-intentions";

export const { updateRevert, update } = getUpdaters({
	get,
	getAll,
	getAllUser,
	getByUsers,
	getIdsByUser,
	getIntentions,
});
