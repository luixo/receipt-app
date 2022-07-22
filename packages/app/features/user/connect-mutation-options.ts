import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { addOutboundIntention } from "app/utils/queries/account-connection-intentions-get-all";
import { updateUser, UsersGetInput } from "app/utils/queries/users-get";
import {
	updatePagedUser,
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
				updatePagedUser(trpcContext, pagedInput, variables.userId, (user) => ({
					...user,
					email: variables.email,
				}));
			} else {
				addOutboundIntention(trpcContext, {
					accountId,
					email: variables.email,
					userId: variables.userId,
					userName,
				});
			}
		},
};
