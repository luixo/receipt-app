import { cache } from "app/cache";
import { TRPCReactContext } from "app/trpc";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptSum = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
) => {
	const receiptItems = cache.receiptItems.getters(trpc).all.get(receiptId);
	if (!receiptItems) {
		return;
	}
	const nextSum = receiptItems.items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);
	cache.receipts.update(trpc, {
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
		getNonResolvedAmount: noop,
		getName: noop,
		getResolvedParticipants: noop,
	});
};
