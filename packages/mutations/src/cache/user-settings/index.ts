import { getUpdaters } from "../utils";

import * as get from "./get";

export const { updateRevert } = getUpdaters({
	get,
});
