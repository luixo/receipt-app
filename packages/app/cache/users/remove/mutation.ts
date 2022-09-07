import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"users.remove",
	{ userSnapshot?: ReturnType<typeof cache["users"]["getPaged"]["remove"]> }
> = {
	onMutate:
		(trpcContext) =>
		({ id }) => ({
			userSnapshot: cache.users.getPaged.remove(trpcContext, id),
		}),
	onError:
		(trpcContext) =>
		(_error, _variables, { userSnapshot } = {}) => {
			if (userSnapshot) {
				cache.users.getPaged.add(trpcContext, userSnapshot.data);
				cache.receipts.getPaged.invalidate(trpcContext, userSnapshot.cursor);
			}
		},
	onSuccess: (trpcContext) => (_result, variables) =>
		cache.users.get.remove(trpcContext, variables.id),
};
