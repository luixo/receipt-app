import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const deleteMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.delete",
	ReturnType<typeof cache["accountConnections"]["getAll"]["outbound"]["remove"]>
> = {
	onMutate: (trpcContext) => (variables) =>
		cache.accountConnections.getAll.outbound.remove(
			trpcContext,
			(intention) => {
				switch (variables.type) {
					case "userId":
						return intention.userId === variables.userId;
					case "targetAccountId":
						return intention.accountId === variables.targetAccountId;
				}
			}
		),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.accountConnections.getAll.outbound.add(
			trpcContext,
			snapshot.intention,
			snapshot.index
		);
	},
};
