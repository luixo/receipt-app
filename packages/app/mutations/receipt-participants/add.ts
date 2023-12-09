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
							name: item.name,
							publicName: item.publicName,
							accountId: item.accountId,
							email: item.email,
							remoteUserId: item.id,
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
					getPaged: (controller) =>
						controller.update(receiptId, (item) => ({
							...item,
							participantResolved: false,
						})),
					getNonResolvedAmount: (controller) => {
						if (!result.some((item) => selfAccountId === item.id)) {
							return;
						}
						controller.update((prev) => prev + 1);
					},
					getResolvedParticipants: (controller) => {
						result.forEach((item) => {
							controller.add(receiptId, {
								remoteUserId: item.id,
								resolved: false,
								localUserId: item.id,
							});
						});
					},
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
