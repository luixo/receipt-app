import * as utils from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import * as get from "./get";
import * as getName from "./get-name";
import * as getPaged from "./get-paged";
import * as suggest from "./suggest";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getName,
	getPaged,
});

export const invalidateSuggest = (trpc: TRPCReactContext) =>
	suggest.getController(trpc).invalidate();
