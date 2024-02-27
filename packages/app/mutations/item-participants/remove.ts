import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { ReceiptsId } from "~web/db/models";

export const options: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.removeItemPart(
					receiptId,
					variables.itemId,
					variables.userId,
				),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error removing participant(s): ${error.message}`,
	}),
};
