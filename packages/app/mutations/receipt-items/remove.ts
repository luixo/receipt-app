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
		(trpcContext, receiptId) =>
		({ id: removedId }) => ({
			revertFns: cache.receiptItems.updateRevert(trpcContext, {
				getReceiptItem: (controller) => controller.remove(receiptId, removedId),
				getReceiptParticipant: noop,
				getReceiptItemPart: noop,
			}),
		}),
	onSuccess: (trpcContext, receiptId) => () => {
		updateReceiptSum(trpcContext, receiptId);
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing item: ${error.message}`,
	}),
};
