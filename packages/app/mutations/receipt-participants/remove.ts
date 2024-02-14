import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { AccountsId, ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"receiptParticipants.remove",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId; resolvedStatus: boolean }
> = {
	onMutate:
		(controllerContext, { receiptId, selfAccountId, resolvedStatus }) =>
		({ userId }) =>
			cache.receipts.updateRevert(controllerContext, {
				get: (controller) =>
					mergeUpdaterResults(
						controller.removeParticipant(receiptId, userId),
						controller.removeItemPartsByUser(receiptId, userId),
					),
				getPaged: undefined,
				getNonResolvedAmount: (controller) => {
					if (userId !== selfAccountId || resolvedStatus) {
						return;
					}
					return controller.update(
						(prev) => prev - 1,
						() => (prev) => prev + 1,
					);
				},
			}),
	errorToastOptions: () => (error) => ({
		text: `Error removing a participant: ${error.message}`,
	}),
};
