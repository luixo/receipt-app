import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { updateOutboundIntentions } from "app/utils/queries/account-connection-intentions-get-all";

export const cancelRequestMutationOptions: UseContextedMutationOptions<"account-connection-intentions.cancel-request"> =
	{
		onSuccess:
			(trpcContext) =>
			(_result, { userId }) => {
				updateOutboundIntentions(trpcContext, (intentions) =>
					intentions.filter((intention) => intention.userId !== userId)
				);
			},
	};
