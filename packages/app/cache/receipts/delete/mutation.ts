import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"receipts.delete",
	{
		receiptSnapshot?: ReturnType<
			typeof cache["receipts"]["getPaged"]["remove"]
		>;
	}
> = {
	onMutate:
		(trpcContext) =>
		({ id }) => ({
			receiptSnapshot: cache.receipts.getPaged.remove(trpcContext, id),
		}),
	onError:
		(trpcContext) =>
		(_error, _variables, { receiptSnapshot } = {}) => {
			if (receiptSnapshot) {
				cache.receipts.getPaged.add(trpcContext, receiptSnapshot);
			}
		},
	onSuccess: (trpcContext) => (_result, variables) =>
		cache.receipts.get.remove(trpcContext, variables.id),
};
