import * as utils from "app/cache/utils";

import * as getAll from "./get-all";

export const { updateRevert, update } = utils.getUpdaters({
	getAll,
});
