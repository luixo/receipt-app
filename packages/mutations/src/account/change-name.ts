import type { AccountId, UserId } from "~db/ids";

import { update as updateAccount } from "../cache/account";
import {
	invalidateSuggest as invalidateSuggestUsers,
	updateRevert as updateRevertUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"account.changeName",
	{ id: AccountId }
> = {
	mutationKey: "account.changeName",
	onMutate:
		(controllerContext, { id }) =>
		(updateObject) =>
			updateRevertUsers(controllerContext, {
				get: (controller) =>
					controller.update(
						// Typesystem doesn't know that we use account id as self user id
						id as UserId,
						(user) => ({ ...user, name: updateObject.name }),
						(prevUser) => (user) => ({ ...user, name: prevUser.name }),
					),
				getForeign: (controller) =>
					controller.updateOwn(
						// Typesystem doesn't know that we use account id as self user id
						id as UserId,
						(user) => ({ ...user, name: updateObject.name }),
						(prevUser) => (user) => ({ ...user, name: prevUser.name }),
					),
				getPaged: undefined,
			}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
		updateAccount(controllerContext, {
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
		void invalidateSuggestUsers(controllerContext);
	},
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changeName.error", { ns: "account", errors }),
		}),
};
