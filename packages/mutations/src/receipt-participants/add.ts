import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receiptParticipants.add"> = {
	mutationKey: "receiptParticipants.add",
	onSuccess: (controllerContext) => (result, variables) => {
		updateReceipts(controllerContext, {
			get: (controller) => {
				const selfUserId = controller.getData(variables.receiptId)?.selfUserId;
				controller.addParticipant(variables.receiptId, {
					userId: variables.userId,
					role: variables.userId === selfUserId ? "owner" : variables.role,
					createdAt: result.createdAt,
				});
			},
			getPaged: undefined,
		});
	},
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.addParticipant.error", {
				ns: "receipts",
				participantsCount: errors.length,
				errors,
			}),
		}),
};
