import * as utils from "app/cache/utils";

import * as get from "./get";
import * as getPaged from "./get-paged";
import * as suggest from "./suggest";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getPaged,
});

export const invalidateSuggest = (controllerContext: utils.ControllerContext) =>
	suggest.getController(controllerContext).invalidate();
