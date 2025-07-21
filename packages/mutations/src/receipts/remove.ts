import { mergeErrors } from "~mutations/utils";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receipts.remove"> = {
	mutationKey: "receipts.remove",
	onMutate: (controllerContext) => (variables) =>
		updateRevertReceipts(controllerContext, {
			get: (controller) => controller.remove(variables.id),
			getPaged: (controller) => controller.remove(variables.id),
		}),
	mutateToastOptions: () => (variablesSet) => ({
		text: `Removing receipt${variablesSet.length > 1 ? "s" : ""}..`,
	}),
	successToastOptions: () => (resultSet) => ({
		text: `Receipt${resultSet.length > 1 ? "s" : ""} removed`,
	}),
	errorToastOptions: () => (errors) => ({
		text: `Error removing receipt${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
	}),
};
