import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receipts.remove"> = {
	onMutate: (controllerContext) => (variables) =>
		updateRevertReceipts(controllerContext, {
			get: (controller) => controller.remove(variables.id),
			getPaged: (controller) => controller.remove(variables.id),
		}),
	mutateToastOptions: {
		text: "Removing receipt..",
	},
	successToastOptions: {
		text: "Receipt removed",
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing receipt: ${error.message}`,
	}),
};
