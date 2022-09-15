import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";

export const options: UseContextedQueryOptions<"users.get"> = {
	onSuccess: (trpcContext) => (data) => {
		cache.users.getName.add(trpcContext, data.remoteId, data.name);
	},
};
