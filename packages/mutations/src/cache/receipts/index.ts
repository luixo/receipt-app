import { getUpdaters } from "../utils";

import * as get from "./get";
import * as getPaged from "./get-paged";

export const { updateRevert, update } = getUpdaters({
	get,
	getPaged,
});
