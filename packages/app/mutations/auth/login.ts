import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(trpcContext) =>
		({ accountId, ...account }) => {
			cache.account.get.set(trpcContext, { id: accountId, ...account });
		},
};
