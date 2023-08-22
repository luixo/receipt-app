import { cache } from "app/cache";
import type { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";

export const options: UseContextedQueryOptions<"users.get"> = {
	onSuccess: (controllerContext) => (data) => {
		cache.users.update(controllerContext, {
			get: undefined,
			getPaged: undefined,
			getName: (controller) => {
				if (data.localId) {
					controller.upsert(data.localId, data.name);
				}
			},
		});
	},
};
