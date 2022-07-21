import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import {
	UsersGetInput,
	updateUser,
	getUserById,
} from "app/utils/queries/users-get";
import {
	getPagedUserById,
	updatePagedUsers,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";

type PagedUserSnapshot = TRPCQueryOutput<"users.get-paged">["items"][number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

export const deleteMutationOptions: UseContextedMutationOptions<
	"users.delete",
	{
		pagedSnapshot?: {
			pageIndex: number;
			userIndex: number;
			user: PagedUserSnapshot;
		};
		snapshot?: UserSnapshot;
	},
	{
		pagedInput: UsersGetPagedInput;
		input: UsersGetInput;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		({ id }) => {
			const pagedSnapshot = getPagedUserById(trpcContext, pagedInput, id);
			const snapshot = getUserById(trpcContext, input);
			updatePagedUsers(trpcContext, pagedInput, (userPage) =>
				userPage.filter((user) => user.id !== id)
			);
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpcContext, pagedInput, (userPage, pageIndex) => {
					if (pageIndex !== pagedSnapshot.pageIndex) {
						return userPage;
					}
					return [
						...userPage.slice(0, pagedSnapshot.userIndex),
						pagedSnapshot.user,
						...userPage.slice(pagedSnapshot.userIndex),
					];
				});
			}
			if (snapshot) {
				updateUser(trpcContext, input, () => snapshot);
			}
		},
	onSuccess:
		(trpcContext, { input }) =>
		() => {
			updateUser(trpcContext, input, () => undefined);
		},
};
