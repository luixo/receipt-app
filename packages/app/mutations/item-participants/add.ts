import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { ReceiptsId } from "~web/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.add",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.addItemParts(receiptId, variables.itemId, variables.userIds),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
