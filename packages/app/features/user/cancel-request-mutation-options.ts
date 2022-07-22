import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { removeOutboundIntention } from "app/utils/queries/account-connection-intentions-get-all";

export const cancelRequestMutationOptions: UseContextedMutationOptions<"account-connection-intentions.cancel-request"> =
	{
		onSuccess:
			(trpcContext) =>
			(_result, { userId }) => {
				removeOutboundIntention(
					trpcContext,
					(intention) => intention.userId === userId
				);
			},
	};
