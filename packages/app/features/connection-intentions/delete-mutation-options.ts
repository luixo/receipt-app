import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import {
	addOutboundIntention,
	removeOutboundIntention,
} from "app/utils/queries/account-connection-intentions-get-all";

export const deleteMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.delete",
	ReturnType<typeof removeOutboundIntention>
> = {
	onMutate: (trpcContext) => (variables) =>
		removeOutboundIntention(trpcContext, (intention) => {
			switch (variables.type) {
				case "userId":
					return intention.userId === variables.userId;
				case "targetAccountId":
					return intention.accountId === variables.targetAccountId;
			}
		}),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		addOutboundIntention(trpcContext, snapshot.intention, snapshot.index);
	},
};
