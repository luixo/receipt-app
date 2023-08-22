import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { ReceiptsId } from "next-app/db/models";

import { updateReceiptSum } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItems.remove",
	ReceiptsId
> = {
	onMutate:
		(controllerContext, receiptId) =>
		({ id: removedId }) =>
			cache.receiptItems.updateRevert(controllerContext, {
				getReceiptItem: (controller) => controller.remove(receiptId, removedId),
				getReceiptParticipant: undefined,
				getReceiptItemPart: undefined,
			}),
	onSuccess: (controllerContext, receiptId) => () => {
		updateReceiptSum(controllerContext, receiptId);
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing item: ${error.message}`,
	}),
};
