import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.logout"> = {
	onSuccess: (controllerContext) => async () => {
		await controllerContext.trpcUtils.invalidate();
	},
	successToastOptions: {
		text: "Logout successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: `Error logging out: ${error.message}`,
	}),
};
