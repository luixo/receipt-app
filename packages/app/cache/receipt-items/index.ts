import * as utils from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import * as getAll from "./get-all";
import * as getReceiptItem from "./get-receipt-item";
import * as getReceiptItemPart from "./get-receipt-item-part";
import * as getReceiptParticipant from "./get-receipt-participant";

export const { updateRevert, update } = utils.getUpdaters({
	getReceiptItem,
	getReceiptParticipant,
	getReceiptItemPart,
});

export const getters = (trpcContext: TRPCReactContext) => ({
	all: getAll.getController(trpcContext),
});
