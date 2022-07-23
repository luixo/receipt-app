import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const unlinkMutationOptions: UseContextedMutationOptions<
	"users.unlink",
	string | undefined,
	{
		pagedInput: Cache.Users.GetPaged.Input;
		input: Cache.Users.Get.Input;
	}
> = {
	onMutate:
		(trpcContext, { input, pagedInput }) =>
		() => {
			cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				input.id,
				(user) => ({
					...user,
					email: null,
				})
			);
			const snapshot = cache.users.get.update(trpcContext, input, (user) => ({
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
			cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				input.id,
				(user) => ({
					...user,
					email,
				})
			);
			cache.users.get.update(trpcContext, input, (user) => ({
				...user,
				email,
			}));
		},
};
