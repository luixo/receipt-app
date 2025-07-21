import { mergeErrors } from "~mutations/utils";

import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.resendEmail"> = {
	mutationKey: "account.resendEmail",
	errorToastOptions: () => (errors) => ({
		text: `Resend email failed: ${mergeErrors(errors)}`,
	}),
};
