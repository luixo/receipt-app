import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { ReceiptsId } from "~web/db/models";

export const options: UseContextedMutationOptions<
	"receiptItems.remove",
	ReceiptsId
> = {
	onMutate:
		(controllerContext, receiptId) =>
		({ id: removedId }) =>
			cache.receipts.updateRevert(controllerContext, {
				get: (controller) => controller.removeItem(receiptId, removedId),
				getPaged: undefined,
				getNonResolvedAmount: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error removing item: ${error.message}`,
	}),
};
