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
			mergeUpdaterResults(
				cache.receiptItems.updateRevert(controllerContext, {
					getReceiptItem: undefined,
					getReceiptParticipant: (controller) =>
						controller.remove(receiptId, userId),
					getReceiptItemPart: (controller) =>
						controller.removeByUser(receiptId, userId),
				}),
				userId === selfAccountId
					? cache.receipts.updateRevert(controllerContext, {
							get: (controller) =>
								controller.update(
									receiptId,
									(item) => ({
										...item,
										participantResolved: null,
									}),
									(snapshot) => (item) => ({
										...item,
										participantResolved: snapshot.participantResolved,
									}),
								),
							getPaged: (controller) =>
								controller.update(
									receiptId,
									(item) => ({
										...item,
										participantResolved: null,
									}),
									(snapshot) => (item) => ({
										...item,
										participantResolved: snapshot.participantResolved,
									}),
								),
							getName: undefined,
							getResolvedParticipants: (controller) =>
								controller.remove(receiptId, userId),
							getNonResolvedAmount: (controller) => {
								if (userId !== selfAccountId || resolvedStatus) {
									return;
								}
								return controller.update(
									(prev) => prev - 1,
									() => (prev) => prev + 1,
								);
							},
					  })
					: undefined,
			),
	errorToastOptions: () => (error) => ({
		text: `Error removing a participant: ${error.message}`,
	}),
};
