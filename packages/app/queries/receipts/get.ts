import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";

export const options: UseContextedQueryOptions<"receipts.get"> = {
	onSuccess: (controllerContext) => (data) => {
		cache.receipts.update(controllerContext, {
			get: undefined,
			getPaged: undefined,
			getName: (controller) => controller.upsert(data.id, data.name),
			getNonResolvedAmount: undefined,
			getResolvedParticipants: undefined,
		});
	},
};
