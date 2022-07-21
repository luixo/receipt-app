import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { updateOutboundIntentions } from "app/utils/queries/account-connection-intentions-get-all";
import { updateUser, UsersGetInput } from "app/utils/queries/users-get";
import {
	updatePagedUsers,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";
import { AccountsId } from "next-app/src/db/models";

export const connectMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.put",
	AccountsId,
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onSuccess:
		(trpcContext, { input, pagedInput }) =>
		({ id: accountId, userName, connected }, variables) => {
			if (connected) {
				updateUser(trpcContext, input, (user) => ({
					...user,
					email: variables.email,
				}));
				updatePagedUsers(trpcContext, pagedInput, (page) =>
					page.map((user) =>
						variables.userId === user.id
							? { ...user, email: variables.email }
							: user
					)
				);
			} else {
				updateOutboundIntentions(trpcContext, (intentions) => [
					...intentions,
					{
						accountId,
						email: variables.email,
						userId: variables.userId,
						userName,
					},
				]);
			}
		},
};
