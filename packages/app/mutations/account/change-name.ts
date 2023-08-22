import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { AccountsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"account.changeName",
	{ id: AccountsId }
> = {
	onMutate:
		(controllerContext, { id }) =>
		(updateObject) =>
			cache.users.updateRevert(controllerContext, {
				get: (controller) =>
					controller.update(
						// Typesystem doesn't know that we use account id as self user id
						id as UsersId,
						(user) => ({ ...user, name: updateObject.name }),
						(prevUser) => (user) => ({ ...user, name: prevUser.name }),
					),
				getName: (controller) =>
					controller.upsert(
						// Typesystem doesn't know that we use account id as self user id
						id as UsersId,
						updateObject.name,
					),
				getPaged: undefined,
			}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
		cache.users.invalidateSuggest(controllerContext);
		cache.account.update(controllerContext, {
			get: (controller) => {
				controller.update((account) => ({
					...account,
					user: {
						...account.user,
						name: updateObject.name,
					},
				}));
			},
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating your name: ${error.message}`,
	}),
};
