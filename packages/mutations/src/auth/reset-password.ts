import { mergeErrors } from "~mutations/utils";

import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.resetPassword"> = {
	mutationKey: "auth.resetPassword",
	successToastOptions: {
		text: "Password successfully reset",
	},
	errorToastOptions: () => (errors) => ({
		text: `Password reset failed: ${mergeErrors(errors)}`,
	}),
};
