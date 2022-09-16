import * as utils from "app/cache/utils";

import * as get from "./get";
import * as getByReceiptId from "./get-by-receipt-id";
import * as getByUsers from "./get-by-users";
import * as getReceipt from "./get-receipt";
import * as getUser from "./get-user";

export const { updateRevert, update } = utils.getUpdaters({
	get,
	getByReceiptId,
	getByUsers,
	getReceipt,
	getUser,
});
