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
						controller.removeParticipant(variables.receiptId, variables.peerId),
						controller.removeItemConsumersByPeer(
							variables.receiptId,
							variables.peerId,
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
