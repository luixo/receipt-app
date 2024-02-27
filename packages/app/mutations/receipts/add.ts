import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { AccountsId, UsersId } from "~web/db/models";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(id, variables) => {
			cache.receipts.update(controllerContext, {
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
								added: new Date(), // We don't care if they don't match with the server
								userId,
								resolved: false,
							})) ?? [],
						items: [],
						ownerUserId: selfUserId,
						selfUserId,
						debt: { direction: "outcoming", ids: [] },
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
