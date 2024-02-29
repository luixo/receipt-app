import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receiptTransferIntentions.accept"> =
	{
		onMutate:
			(controllerContext) =>
			({ receiptId }) =>
				cache.receiptTransferIntentions.updateRevert(controllerContext, {
					getAll: (controller) => controller.inbound.remove(receiptId),
				}),
		onSuccess: (controllerContext) => () =>
			cache.receipts.update(controllerContext, {
				getPaged: (controller) => controller.invalidate(),
				get: undefined,
				getNonResolvedAmount: undefined,
			}),
		successToastOptions: () => () => ({
			text: `Receipt was successfully accepted`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error accepting receipt: ${error.message}`,
		}),
	};
