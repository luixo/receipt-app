import * as utils from "~app/cache/utils";

import * as get from "./get";
import * as getNonResolvedAmount from "./get-non-resolved-amount";
import * as getPaged from "./get-paged";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getNonResolvedAmount,
	getPaged,
});
