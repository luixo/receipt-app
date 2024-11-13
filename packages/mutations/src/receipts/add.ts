import type { AccountsId, UsersId } from "~db/models";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(result, variables) => {
			updateReceipts(controllerContext, {
				getPaged: (controller) => controller.invalidate(),
				get: (controller) => {
					const selfUserId = selfAccountId as UsersId;
					controller.add({
						id: result.id,
						createdAt: result.createdAt,
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						participants:
							variables.participants?.map(({ userId, role }, index) => {
								const matchedResult = result.participants[index];
								if (!matchedResult) {
									throw new Error(
										`Expected to have item index ${index} returned from receipt creation.`,
									);
								}
								return {
									role: userId === selfUserId ? "owner" : role,
									createdAt: matchedResult.createdAt,
									userId,
								};
							}) ?? [],
						items:
							variables.items?.map((item, index) => {
								const matchedResult = result.items[index];
								if (!matchedResult) {
									throw new Error(
										`Expected to have item index ${index} returned from receipt creation.`,
									);
								}
								return {
									id: matchedResult.id,
									createdAt: matchedResult.createdAt,
									name: item.name,
									price: item.price,
									quantity: item.quantity,
									parts:
										item.parts?.map((part) => ({
											userId: part.userId,
											part: part.part,
										})) ?? [],
								};
							}) ?? [],
						ownerUserId: selfUserId,
						selfUserId,
						debt: { direction: "outcoming", ids: [] },
					});
				},
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
