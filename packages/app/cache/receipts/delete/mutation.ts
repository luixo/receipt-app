import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"receipts.delete",
	{
		receiptSnapshot?: ReturnType<
			typeof cache["receipts"]["getPaged"]["remove"]
		>;
	},
	{
		pagedInput: Cache.Receipts.GetPaged.Input;
		input: Cache.Receipts.Get.Input;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput }) =>
		({ id }) => ({
			receiptSnapshot: cache.receipts.getPaged.remove(
				trpcContext,
				pagedInput,
				(receipt) => receipt.id === id
			),
		}),
	onError:
		(trpcContext, { pagedInput }) =>
		(_error, _variables, { receiptSnapshot } = {}) => {
			if (receiptSnapshot) {
				cache.receipts.getPaged.add(trpcContext, pagedInput, receiptSnapshot);
			}
		},
	onSuccess:
		(trpcContext, { input }) =>
		() =>
			cache.receipts.get.remove(trpcContext, input),
};
