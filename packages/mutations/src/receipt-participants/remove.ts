import type { AccountsId, ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<
	"receiptParticipants.remove",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId; resolvedStatus: boolean }
> = {
	onMutate:
		(controllerContext, { receiptId, selfAccountId, resolvedStatus }) =>
		({ userId }) =>
			updateRevertReceipts(controllerContext, {
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
