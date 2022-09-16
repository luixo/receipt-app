import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { noop } from "app/utils/utils";

export const options: UseContextedQueryOptions<"receipts.get"> = {
	onSuccess: (trpcContext) => (data) => {
		cache.receipts.update(trpcContext, {
			get: noop,
			getPaged: noop,
			getName: (controller) => controller.upsert(data.id, data.name),
			getNonResolvedAmount: noop,
			getResolvedParticipants: noop,
		});
	},
};
