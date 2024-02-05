import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"receiptTransferIntentions.accept"> =
	{
		onMutate:
			(controllerContext) =>
			({ receiptId }) =>
				cache.receiptTransferIntentions.updateRevert(controllerContext, {
					getAll: (controller) => controller.inbound.remove(receiptId),
				}),
		successToastOptions: () => () => ({
			text: `Receipt was successfully accepted`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error accepting receipt: ${error.message}`,
		}),
	};
