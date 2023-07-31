import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";

export const options: UseContextedMutationOptions<"users.unlink"> = {
	onMutate: (controllerContext) => (variables) =>
		cache.users.updateRevert(controllerContext, {
			get: (controller) =>
				controller.update(
					variables.id,
					(user) => ({
						...user,
						email: null,
						accountId: null,
					}),
					(snapshot) => (user) => ({
						...user,
						email: snapshot.email,
						accountId: snapshot.accountId,
					}),
				),
			getName: noop,
			getPaged: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, email: null }),
					(snapshot) => (user) => ({ ...user, email: snapshot.email }),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error unlinking user: ${error.message}`,
	}),
};
