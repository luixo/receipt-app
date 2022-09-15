import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
	onSuccess: (trpcContext) => () => {
		cache.account.get.update(trpcContext, (account) => ({
			...account,
			verified: true,
		}));
	},
};
