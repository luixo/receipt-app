import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.add",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receiptItems.updateRevert(controllerContext, {
			getReceiptItem: undefined,
			getReceiptParticipant: undefined,
			getReceiptItemPart: (controller) =>
				mergeUpdaterResults(
					...variables.userIds.map((userId) =>
						controller.add(receiptId, variables.itemId, { userId, part: 1 }),
					),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
