import { cache } from "app/cache";
import * as utils from "app/cache/utils";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptSum = (
	controllerContext: utils.ControllerContext,
	receiptId: ReceiptsId,
) => {
	const receiptItems = cache.receiptItems
		.getters(controllerContext)
		.all.get(receiptId);
	if (!receiptItems) {
		return;
	}
	const nextSum = receiptItems.items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);
	cache.receipts.update(controllerContext, {
		get: (controller) =>
			controller.update(receiptId, (receipt) => ({
				...receipt,
				sum: nextSum,
			})),
		getPaged: (controller) =>
			controller.update(receiptId, (receipt) => ({
				...receipt,
				sum: nextSum,
			})),
		getNonResolvedAmount: undefined,
		getName: undefined,
		getResolvedParticipants: undefined,
	});
};
