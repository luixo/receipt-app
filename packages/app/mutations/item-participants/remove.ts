import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) => ({
		revertFns: cache.receiptItems.updateRevert(trpcContext, {
			getReceiptItem: noop,
			getReceiptParticipant: noop,
			getReceiptItemPart: (controller) =>
				controller.remove(receiptId, variables.itemId, variables.userId),
		}),
	}),
};
