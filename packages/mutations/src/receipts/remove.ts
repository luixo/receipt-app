import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receipts.remove"> = {
	mutationKey: "receipts.remove",
	onMutate: (controllerContext) => (variables) =>
		updateRevertReceipts(controllerContext, {
			get: (controller) => controller.remove(variables.id),
			getPaged: undefined,
		}),
	onSuccess: (controllerContext) => () => {
		updateReceipts(controllerContext, {
			get: undefined,
			getPaged: (controller) => controller.invalidate(),
		});
	},
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.removeReceipt.mutate", {
				ns: "receipts",
				receiptsCount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(resultSet) => ({
			text: t("toasts.removeReceipt.success", {
				ns: "receipts",
				receiptsCount: resultSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.removeReceipt.error", {
				ns: "receipts",
				receiptsCount: errors.length,
				errors,
			}),
		}),
};
