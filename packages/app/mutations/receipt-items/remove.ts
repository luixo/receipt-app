import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

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
				getReceiptParticipant: noop,
				getReceiptItemPart: noop,
			}),
	onSuccess: (controllerContext, receiptId) => () => {
		updateReceiptSum(controllerContext, receiptId);
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing item: ${error.message}`,
	}),
};
