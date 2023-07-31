import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receiptItems.updateRevert(controllerContext, {
			getReceiptItem: undefined,
			getReceiptParticipant: undefined,
			getReceiptItemPart: (controller) =>
				controller.remove(receiptId, variables.itemId, variables.userId),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error removing participant(s): ${error.message}`,
	}),
};
