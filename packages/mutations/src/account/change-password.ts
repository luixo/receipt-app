import { mergeErrors } from "~mutations/utils";

import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changePassword"> = {
	mutationKey: "account.changePassword",
	errorToastOptions: () => (errors) => ({
		text: `Error changing password: ${mergeErrors(errors)}`,
	}),
};
