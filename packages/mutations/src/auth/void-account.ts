import { mergeErrors } from "~mutations/utils";

import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.voidAccount"> = {
	mutationKey: "auth.voidAccount",
	successToastOptions: {
		text: "Account successfully voided, redirecting..",
	},
	errorToastOptions: () => (errors) => ({
		text: `Void account failed: ${mergeErrors(errors)}`,
	}),
};
