import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.unlink"> = {
	onMutate: (controllerContext) => (variables) =>
		cache.users.updateRevert(controllerContext, {
			get: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, account: undefined }),
					(snapshot) => (user) => ({ ...user, account: snapshot.account }),
				),
			getName: undefined,
			getPaged: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, account: undefined }),
					(snapshot) => (user) => ({ ...user, account: snapshot.account }),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error unlinking user: ${error.message}`,
	}),
};
