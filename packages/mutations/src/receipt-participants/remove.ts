import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<"receiptParticipants.remove"> =
	{
		onMutate: (controllerContext) => (variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					mergeUpdaterResults(
						controller.removeParticipant(variables.receiptId, variables.userId),
						controller.removeItemPartsByUser(
							variables.receiptId,
							variables.userId,
						),
					),
				getPaged: undefined,
			}),
		errorToastOptions: () => (error) => ({
			text: `Error removing a participant: ${error.message}`,
		}),
	};
