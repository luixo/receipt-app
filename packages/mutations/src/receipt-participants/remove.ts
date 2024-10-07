import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<
	"receiptParticipants.remove",
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(controllerContext, { receiptId }) =>
		({ userId }) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					mergeUpdaterResults(
						controller.removeParticipant(receiptId, userId),
						controller.removeItemPartsByUser(receiptId, userId),
					),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error removing a participant: ${error.message}`,
	}),
};
