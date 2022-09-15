import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<
	"auth.register",
	void,
	{ name: string }
> = {
	onSuccess:
		(trpcContext, { name }) =>
		({ accountId }) => {
			cache.account.get.set(trpcContext, {
				id: accountId,
				name,
				publicName: null,
				verified: false,
			});
		},
};
