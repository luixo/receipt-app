import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

const removePagedUser = cache.users.getPaged.remove;

export const mutationOptions: UseContextedMutationOptions<
	"users.delete",
	{ userSnapshot?: ReturnType<typeof removePagedUser> },
	{ pagedInput: Cache.Users.GetPaged.Input; input: Cache.Users.Get.Input }
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
				cache.users.getPaged.add(trpcContext, pagedInput, userSnapshot);
			}
		},
	onSuccess:
		(trpcContext, { input }) =>
		() =>
			cache.users.get.remove(trpcContext, input),
};
