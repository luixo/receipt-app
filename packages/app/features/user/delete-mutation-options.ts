import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersGetInput, removeUser } from "app/utils/queries/users-get";
import {
	addPagedUser,
	removePagedUser,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";

export const deleteMutationOptions: UseContextedMutationOptions<
	"users.delete",
	{ userSnapshot?: ReturnType<typeof removePagedUser> },
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate:
		(trpcContext, { pagedInput }) =>
		({ id }) => ({
			userSnapshot: removePagedUser(
				trpcContext,
				pagedInput,
				(user) => user.id === id
			),
		}),
	onError:
		(trpcContext, { pagedInput }) =>
		(_error, _variables, { userSnapshot } = {}) => {
			if (userSnapshot) {
				addPagedUser(trpcContext, pagedInput, userSnapshot);
			}
		},
	onSuccess:
		(trpcContext, { input }) =>
		() =>
			removeUser(trpcContext, input),
};
