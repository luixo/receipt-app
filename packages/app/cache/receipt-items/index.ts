import * as utils from "app/cache/utils";

import * as getAll from "./get-all";
import * as getReceiptItem from "./get-receipt-item";
import * as getReceiptItemPart from "./get-receipt-item-part";
import * as getReceiptParticipant from "./get-receipt-participant";

export const { updateRevert, update } = utils.getUpdaters({
	getReceiptItem,
	getReceiptParticipant,
	getReceiptItemPart,
});

export const getters = (controllerContext: utils.ControllerContext) => ({
	all: getAll.getController(controllerContext),
});
