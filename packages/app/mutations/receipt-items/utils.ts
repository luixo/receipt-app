import { cache } from "app/cache";
import type * as utils from "app/cache/utils";
import type { ReceiptsId } from "next-app/db/models";

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
		getPaged: undefined,
		getNonResolvedAmount: undefined,
		getResolvedParticipants: undefined,
	});
};
