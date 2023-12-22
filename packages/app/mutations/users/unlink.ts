import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.unlink"> = {
	onMutate: (controllerContext) => (variables) =>
		cache.users.updateRevert(controllerContext, {
			get: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, connectedAccount: undefined }),
					(snapshot) => (user) => ({
						...user,
						connectedAccount: snapshot.connectedAccount,
					}),
				),
			getName: undefined,
			getPaged: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, connectedAccount: undefined }),
					(snapshot) => (user) => ({
						...user,
						connectedAccount: snapshot.connectedAccount,
					}),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error unlinking user: ${error.message}`,
	}),
};
