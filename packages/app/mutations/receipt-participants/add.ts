import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { AccountsId, ReceiptsId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"receiptParticipants.add",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onSuccess:
		(trpcContext, { receiptId, selfAccountId }) =>
		(result) => {
			cache.receiptItems.update(trpcContext, {
				getReceiptItem: noop,
				getReceiptParticipant: (controller) => {
					result.forEach((item) =>
						controller.add(receiptId, {
							name: item.name,
							publicName: item.publicName,
							accountId: item.accountId,
							email: item.email,
							remoteUserId: item.id,
							localUserId: item.id,
							role: item.role,
							resolved: false,
							added: item.added,
						}),
					);
				},
				getReceiptItemPart: noop,
			});
			const selfParticipating = result.find(
				(resultItem) => resultItem.role === "owner",
			);
			if (selfParticipating) {
				cache.receipts.update(trpcContext, {
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
					getName: noop,
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
