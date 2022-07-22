import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersGetInput, updateUser } from "app/utils/queries/users-get";
import {
	updatePagedUser,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";

export const unlinkMutationOptions: UseContextedMutationOptions<
	"users.unlink",
	string | undefined,
	{
		pagedInput: UsersGetPagedInput;
		input: UsersGetInput;
	}
> = {
	onMutate:
		(trpcContext, { input, pagedInput }) =>
		() => {
			updatePagedUser(trpcContext, pagedInput, input.id, (user) => ({
				...user,
				email: null,
			}));
			const snapshot = updateUser(trpcContext, input, (user) => ({
				...user,
				email: null,
			}));
			return snapshot?.email ?? undefined;
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, email) => {
			if (!email) {
				return;
			}
			updatePagedUser(trpcContext, pagedInput, input.id, (user) => ({
				...user,
				email,
			}));
			updateUser(trpcContext, input, (user) => ({ ...user, email }));
		},
};
