import { getUpdaters } from "../utils";

import * as get from "./get";

export const { updateRevert, update } = getUpdaters({
	get,
});
