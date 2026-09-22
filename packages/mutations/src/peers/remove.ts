import {
	invalidateSuggest as invalidateSuggestPeers,
	updateRevert as updateRevertPeers,
} from "../cache/peers";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"peers.remove"> = {
	mutationKey: "peers.remove",
	onMutate:
		(controllerContext) =>
		({ id }) =>
			updateRevertPeers(controllerContext, {
				get: (controller) => controller.remove(id),
				getForeign: (controller) => controller.removeOwn(id),
				getPaged: (controller) => controller.remove(id),
			}),
	onSuccess: (controllerContext) => () =>
		invalidateSuggestPeers(controllerContext),
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.removePeer.mutate", {
				ns: "peers",
				peersAmount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(_resultSet, variablesSet) => ({
			text: t("toasts.removePeer.success", {
				ns: "peers",
				peersAmount: variablesSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.removePeer.error", {
				ns: "peers",
				peersAmount: errors.length,
				errors,
			}),
		}),
};
