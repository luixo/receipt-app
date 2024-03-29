import type { AccountsId, UsersId } from "~db";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

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
				getForeign: (controller) =>
					controller.updateOwn(
						// Typesystem doesn't know that we use account id as self user id
						id as UsersId,
						(user) => ({ ...user, name: updateObject.name }),
						(prevUser) => (user) => ({ ...user, name: prevUser.name }),
					),
				getPaged: undefined,
			}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
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
		void cache.users.invalidateSuggest(controllerContext);
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating your name: ${error.message}`,
	}),
};
