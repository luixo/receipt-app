import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.add",
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) =>
		cache.receiptItems.updateRevert(trpcContext, {
			getReceiptItem: noop,
			getReceiptParticipant: noop,
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
