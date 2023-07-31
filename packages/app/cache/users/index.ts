import * as utils from "app/cache/utils";

import * as get from "./get";
import * as getName from "./get-name";
import * as getPaged from "./get-paged";
import * as suggest from "./suggest";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getName,
	getPaged,
});

export const invalidateSuggest = (controllerContext: utils.ControllerContext) =>
	suggest.getController(controllerContext).invalidate();
