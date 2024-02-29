import { getUpdaters } from "../utils";

import * as getAll from "./get-all";

export const { updateRevert, update } = getUpdaters({
	getAll,
});
