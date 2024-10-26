import type { AccountsId, ReceiptsId, UsersId } from "~db/models";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptParticipants.add",
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { receiptId, selfAccountId }) =>
		(result, variables) => {
			const selfUserId = selfAccountId as UsersId;
			updateReceipts(controllerContext, {
				get: (controller) => {
					controller.addParticipant(receiptId, {
						userId: variables.userId,
						role: variables.userId === selfUserId ? "owner" : variables.role,
						createdAt: result.createdAt,
					});
				},
				getPaged: undefined,
			});
			if (variables.userId === selfUserId) {
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
