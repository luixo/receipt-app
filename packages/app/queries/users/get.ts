import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { noop } from "app/utils/utils";

export const options: UseContextedQueryOptions<"users.get"> = {
	onSuccess: (controllerContext) => (data) => {
		cache.users.update(controllerContext, {
			get: noop,
			getPaged: noop,
			getName: (controller) => {
				if (data.localId) {
					controller.upsert(data.localId, data.name);
				}
			},
		});
	},
};
