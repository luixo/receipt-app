import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"users.unlink",
	string | undefined
> = {
	onMutate: (trpcContext) => (variables) => {
		cache.users.getPaged.update(trpcContext, variables.id, (user) => ({
			...user,
			email: null,
		}));
		const snapshot = cache.users.get.update(
			trpcContext,
			variables.id,
			(user) => ({ ...user, email: null })
		);
		return snapshot?.email ?? undefined;
	},
	onError: (trpcContext) => (_error, variables, email) => {
		if (!email) {
			return;
		}
		cache.users.getPaged.update(trpcContext, variables.id, (user) => ({
			...user,
			email,
		}));
		cache.users.get.update(trpcContext, variables.id, (user) => ({
			...user,
			email,
		}));
	},
};
