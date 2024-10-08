import type { ReceiptsId } from "~db/models";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptParticipants.add",
	{ receiptId: ReceiptsId }
> = {
	onSuccess:
		(controllerContext, { receiptId }) =>
		(result) => {
			updateReceipts(controllerContext, {
				get: (controller) => {
					result.forEach((item) =>
						controller.addParticipant(receiptId, {
							userId: item.id,
							role: item.role,
							createdAt: item.createdAt,
						}),
					);
				},
				getPaged: undefined,
			});
			const selfParticipating = result.find(
				(resultItem) => resultItem.role === "owner",
			);
			if (selfParticipating) {
				updateReceipts(controllerContext, {
					get: undefined,
					getPaged: undefined,
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
