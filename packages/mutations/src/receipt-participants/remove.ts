import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

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
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.removeParticipant.error", {
					ns: "receipts",
					participantsCount: errors.length,
					errors,
				}),
			}),
	};
