import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { AccountsId, ReceiptsId } from "~web/db/models";

export const options: UseContextedMutationOptions<
	"receiptParticipants.add",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { receiptId, selfAccountId }) =>
		(result) => {
			cache.receipts.update(controllerContext, {
				get: (controller) => {
					result.forEach((item) =>
						controller.addParticipant(receiptId, {
							userId: item.id,
							role: item.role,
							resolved: false,
							added: item.added,
						}),
					);
				},
				getPaged: undefined,
				getNonResolvedAmount: undefined,
			});
			const selfParticipating = result.find(
				(resultItem) => resultItem.role === "owner",
			);
			if (selfParticipating) {
				cache.receipts.update(controllerContext, {
					get: undefined,
					getPaged: undefined,
					getNonResolvedAmount: (controller) => {
						if (!result.some((item) => selfAccountId === item.id)) {
							return;
						}
						controller.update((prev) => prev + 1);
					},
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
