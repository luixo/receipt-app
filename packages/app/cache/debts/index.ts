import * as utils from "app/cache/utils";

import * as get from "./get";
import * as getByUsers from "./get-by-users";
import * as getIntentions from "./get-intentions";
import * as getUser from "./get-user";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getByUsers,
	getUser,
	getIntentions,
});
