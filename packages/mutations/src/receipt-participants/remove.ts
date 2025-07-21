import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeErrors, mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<"receiptParticipants.remove"> =
	{
		mutationKey: "receiptParticipants.remove",
		onMutate: (controllerContext) => (variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					mergeUpdaterResults(
						controller.removeParticipant(variables.receiptId, variables.userId),
						controller.removeItemConsumersByUser(
							variables.receiptId,
							variables.userId,
						),
					),
				getPaged: undefined,
			}),
		errorToastOptions: () => (errors) => ({
			text: `Error removing participant${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
		}),
	};
