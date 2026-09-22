import type { ControllerContext } from "../../types";
import { getUpdaters } from "../utils";

import * as get from "./get";
import * as getForeign from "./get-foreign";
import * as getPaged from "./get-paged";
import * as suggest from "./suggest";

export const { updateRevert, update } = getUpdaters({
	get,
	getForeign,
	getPaged,
});

export const invalidateSuggest = (controllerContext: ControllerContext) =>
	suggest.getController(controllerContext).invalidate();
