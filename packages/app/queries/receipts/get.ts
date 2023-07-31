import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { noop } from "app/utils/utils";

export const options: UseContextedQueryOptions<"receipts.get"> = {
	onSuccess: (controllerContext) => (data) => {
		cache.receipts.update(controllerContext, {
			get: noop,
			getPaged: noop,
			getName: (controller) => controller.upsert(data.id, data.name),
			getNonResolvedAmount: noop,
			getResolvedParticipants: noop,
		});
	},
};
