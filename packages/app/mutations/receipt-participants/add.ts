import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { AccountsId, ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"receiptParticipants.add",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { receiptId, selfAccountId }) =>
		(result) => {
			cache.receiptItems.update(controllerContext, {
				getReceiptItem: undefined,
				getReceiptParticipant: (controller) => {
					result.forEach((item) =>
						controller.add(receiptId, {
							userId: item.id,
							role: item.role,
							resolved: false,
							added: item.added,
						}),
					);
				},
				getReceiptItemPart: undefined,
			});
			const selfParticipating = result.find(
				(resultItem) => resultItem.role === "owner",
			);
			if (selfParticipating) {
				cache.receipts.update(controllerContext, {
					get: (controller) =>
						controller.update(receiptId, (item) => ({
							...item,
							participantResolved: false,
						})),
					getPaged: undefined,
					getNonResolvedAmount: (controller) => {
						if (!result.some((item) => selfAccountId === item.id)) {
							return;
						}
						controller.update((prev) => prev + 1);
					},
					// TODO: to be fixed with resolved participants calculated from receipt data
					getResolvedParticipants: undefined,
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
