import { cache } from "~app/cache";
import { mergeUpdaterResults } from "~app/cache/utils";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"receiptTransferIntentions.remove"> =
	{
		onMutate:
			(controllerContext) =>
			({ receiptId }) =>
				mergeUpdaterResults(
					cache.receipts.updateRevert(controllerContext, {
						get: (controller) =>
							controller.update(
								receiptId,
								(receipt) => ({
									...receipt,
									transferIntentionUserId: undefined,
								}),
								(snapshot) => (receipt) => ({
									...receipt,
									transferIntentionUserId: snapshot.transferIntentionUserId,
								}),
							),
						getNonResolvedAmount: undefined,
						getPaged: undefined,
					}),
					cache.receiptTransferIntentions.updateRevert(controllerContext, {
						getAll: (controller) =>
							mergeUpdaterResults(
								controller.outbound.remove(receiptId),
								controller.inbound.remove(receiptId),
							),
					}),
				),
		errorToastOptions: () => (error) => ({
			text: `Error removing receipt transfer intention: ${error.message}`,
		}),
	};
