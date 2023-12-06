import * as utils from "app/cache/utils";

import * as get from "./get";

export const { updateRevert, update } = utils.getUpdaters({
	get,
});
