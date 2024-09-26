import type { AccountsId, UsersId } from "~db/models";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(id, variables) => {
			updateReceipts(controllerContext, {
				getPaged: (controller) => controller.invalidate(),
				get: (controller) => {
					const selfUserId = selfAccountId as UsersId;
					controller.add({
						id,
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						participants:
							variables.participants?.map((userId) => ({
								role: userId === selfUserId ? "owner" : "editor",
								createdAt: new Date(), // We don't care if they don't match with the server
								userId,
								resolved: false,
							})) ?? [],
						items: [],
						ownerUserId: selfUserId,
						selfUserId,
						debt: { direction: "outcoming", ids: [] },
						transferIntentionUserId: undefined,
						lockedTimestamp: undefined,
					});
				},
				getNonResolvedAmount: undefined,
			});
		},
	mutateToastOptions: () => (variables) => ({
		text: `Adding receipt "${variables.name}"..`,
	}),
	successToastOptions: () => (_result, variables) => ({
		text: `Receipt "${variables.name}" added`,
	}),
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding receipt "${variables.name}": ${error.message}`,
	}),
};
