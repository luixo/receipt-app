import { getUpdaters } from "../utils";

import * as get from "./get";
import * as getAll from "./get-all";
import * as getAllUser from "./get-all-user";
import * as getByUserPaged from "./get-by-user-paged";
import * as getIntentions from "./get-intentions";
import * as getUsersPaged from "./get-users-paged";

export const { updateRevert, update } = getUpdaters({
	get,
	getAll,
	getAllUser,
	getUsersPaged,
	getByUserPaged,
	getIntentions,
});
