import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<
	"auth.register",
	{ name: string }
> = {
	onSuccess:
		(trpcContext, { name }) =>
		({ accountId }) =>
			cache.account.update(trpcContext, {
				get: (controller) =>
					controller.upsert({
						id: accountId,
						name,
						publicName: null,
						verified: false,
					}),
			}),
};
