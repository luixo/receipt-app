import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receiptParticipants.add"> = {
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
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
