import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";

type PagedUserSnapshot = TRPCQueryOutput<"users.getPaged">["items"][number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

export const options: UseContextedMutationOptions<
	"users.unlink",
	{ pagedRevert?: Revert<PagedUserSnapshot>; revert?: Revert<UserSnapshot> }
> = {
	onMutate: (trpcContext) => (variables) => {
		const pagedSnapshot = cache.users.getPaged.update(
			trpcContext,
			variables.id,
			(user) => ({
				...user,
				email: null,
			})
		);
		const snapshot = cache.users.get.update(
			trpcContext,
			variables.id,
			(user) => ({ ...user, email: null, accountId: null })
		);
		return {
			pagedRevert: pagedSnapshot
				? (user) => ({
						...user,
						email: pagedSnapshot.email,
				  })
				: undefined,
			revert: snapshot
				? (user) => ({
						...user,
						email: snapshot.email,
						accountId: snapshot.accountId,
				  })
				: undefined,
		};
	},
	onError: (trpcContext) => (_error, variables, snapshot) => {
		if (snapshot?.revert) {
			cache.users.get.update(trpcContext, variables.id, snapshot.revert);
		}
		if (snapshot?.pagedRevert) {
			cache.users.getPaged.update(
				trpcContext,
				variables.id,
				snapshot.pagedRevert
			);
		}
	},
};
