import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { AccountsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"account.changeName",
	{ id: AccountsId }
> = {
	onMutate:
		(trpcContext, { id }) =>
		(updateObject) =>
			cache.users.updateRevert(trpcContext, {
				get: (controller) =>
					controller.update(
						// Typesystem doesn't know that we use account id as self user id
						id as UsersId,
						(user) => ({ ...user, name: updateObject.name }),
						(prevUser) => (user) => ({ ...user, name: prevUser.name })
					),
				getName: (controller) =>
					controller.upsert(
						// Typesystem doesn't know that we use account id as self user id
						id as UsersId,
						updateObject.name
					),
				getPaged: noop,
			}),
	onSuccess: (trpcContext) => (_result, updateObject) => {
		cache.users.invalidateSuggest(trpcContext);
		cache.account.update(trpcContext, {
			get: (controller) => {
				controller.update((account) => ({
					...account,
					name: updateObject.name,
				}));
			},
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating your name: ${error.message}`,
	}),
};
